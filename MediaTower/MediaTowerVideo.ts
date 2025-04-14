import { Media, PropDescriptor } from 'ifland.PropEngine';
import { IFSBehaviour } from 'ifland.ScriptEngine';
import { Debug, Material, Vector2, Application, RuntimePlatform, MeshRenderer, WaitForSeconds, Coroutine, Texture } from 'UnityEngine';

enum EventType
{
        MetaDataReady,		// Triggered when meta data(width, duration etc) is available
        ReadyToPlay,		// Triggered when the video is loaded and ready to play
        Started,			// Triggered when the playback starts
        FirstFrameReady,	// Triggered when the first frame has been rendered
        FinishedPlaying,	// Triggered when a non-looping video has finished playing
        Closing,			// Triggered when the media is closed
        Error,				// Triggered when an error occurs
        SubtitleChange,		// Triggered when the subtitles change
        Stalled,			// Triggered when media is stalled (eg. when lost connection to media stream)
        Unstalled,			// Triggered when media is resumed form a stalled state (eg. when lost connection is re-established)
        ResolutionChanged,	// Triggered when the resolution of the video has changed (including the load) Useful for adaptive streams
        StartedSeeking,		// Triggered when seeking begins
        FinishedSeeking,    // Triggered when seeking has finished
        StartedBuffering,	// Triggered when buffering begins
        FinishedBuffering,	// Triggered when buffering has finished
        PropertiesChanged,	// Triggered when any properties (eg stereo packing are changed) - this has to be triggered manually
        PlaylistItemChanged,// Triggered when the new item is played in the playlist
        PlaylistFinished,	// Triggered when the playlist reaches the end

        TextTracksChanged,	// Triggered when the text tracks are added or removed
        TextCueChanged = SubtitleChange,	// Triggered when the text to display changes

        // TODO: 
        //StartLoop,		// Triggered when the video starts and is in loop mode
        //EndLoop,			// Triggered when the video ends and is in loop mode
        //NewFrame			// Trigger when a new video frame is available
};

export default class MediaTowerVideo extends IFSBehaviour
{
    public videoMaterial : Material;
    public loadingMaterial : Material;
    public videoRenderer : MeshRenderer;
    public propDescriptor : PropDescriptor;

    private videoCount : int;
    private urlList : Array<string>;
    private noList : Array<number>;
    private cursor : int;

    private propID : int;
    private isRegister : bool;
    private isDisabled : bool;

    private startMuteState : bool;

    private baseSize : Vector2 = new Vector2(9, 16);
    private materialTurn : bool;

    private videoWidth : int;
    private videoHeight : int;
    private videoState : int;
    private videoPos : int;
    private videoPrevPos : int;
    private videoRenderQueue : int;

    private aspectCor : Coroutine;
    private stallCor : Coroutine;

    CaptureLastFrameCallback : (width : int, height : int) => void;
    ReleaseLastFrameCallback : () => void;

    TowerLog(str : string)
    {
        Debug.Log("PIID : " + this.PropInstaceID + " [MediaTower] " + str);
    }

    TowerLogError(str : string)
    {
        Debug.LogError("PIID : " + this.PropInstaceID + " [MediaTower] " + str);
    }
    
    Initialize(renderQueue : int)
    {
        this.propID = this.propDescriptor.PropInstanceID;
        this.isRegister = false;
        this.videoState = -1;
        this.videoRenderQueue = renderQueue;
        this.aspectCor = null;
        this.stallCor = null;
    }

    Register()
    {
        this.isRegister = Media.Register(this.propID, 1, this.videoMaterial,
        (state: number) => {
            this.OnChangeMediaState(state);
        },
        (pos : double, len : double) => 
        {
            if(pos > 0)
            {
                this.videoPos = pos * 1000.0;
            }
        });
    }

    OnEnable()
    {
        if(this.PropInstaceID < 0)
        {
            return;
        }
        this.isDisabled = false;
        this.TowerLog("MediaTowerVideo OnEnable");
    }

    OnDisable()
    {
        if(this.PropInstaceID < 0)
        {
            return;
        }
        this.isDisabled = true;
        this.TowerLog("MediaTowerVideo OnDisable");
        this.StopShortForm();
    }

    OnChangeMediaState(state : number)
    {
        // this.TowerLog("[TEST] eventType : " + state);
        switch(state)
        {
            case EventType.Started :
                if(this.videoState == EventType.FirstFrameReady || this.videoState == EventType.Stalled)
                {
                    this.videoState = state;
                    this.OnStarted();
                }
                break;
            case EventType.FirstFrameReady :
                if(this.videoState == -1 || this.videoState == EventType.Error || this.videoState == EventType.FinishedPlaying)
                {
                    var isErrored = false;
                    if(this.videoState == EventType.Error)
                    {
                        isErrored = true;
                    }
                    this.videoState = state;
                    this.OnFirstFrameReady(isErrored);
                }
                else if(this.videoState == EventType.Started)
                {
                    this.TowerLog("BlueTooth On/Off");
                    this.OnFirstFrameReady(false, false);
                }
                break;
            case EventType.FinishedPlaying : 
                if(this.videoState == EventType.Started || this.videoState == EventType.Stalled)
                {
                    this.videoState = state;
                    this.OnFinishedPlaying();
                }
                break;
            case EventType.Stalled : 
                if(this.videoState == EventType.Started || this.videoState == EventType.Stalled)
                {
                    this.videoState = state;
                    this.OnStalled();
                }
                break;
            case EventType.Unstalled : 
                if(this.videoState == EventType.Stalled)
                {
                    this.OnUnstalled();
                }
                break;
            case EventType.Error :
                if(this.videoState == EventType.FirstFrameReady)
                {
                    this.videoState = state;
                    this.OnErrorBeforeStarted();
                }
                else if(this.videoState == EventType.Started || this.videoState == EventType.Stalled)
                {
                    this.videoState = state;
                    this.OnErrorAfterStarted();
                }
                break;
            case EventType.Closing :
                if(this.videoState == EventType.Started)
                {
                    if(this.isDisabled == false)
                    {
                        this.TowerLog("Video Closed before Finish");
                        this.CaptureLastFrameCallback(this.videoWidth, this.videoHeight);
                        this.videoRenderer.material = this.loadingMaterial;
                    }
                }
                break;
        }
    }

    OnStarted()
    {
        this.TowerLog("Started");
        this.ReleaseLastFrameCallback();
    }

    OnFirstFrameReady(isErrored : bool, isAutoPlay : bool = true)
    {
        this.TowerLog("FirstFrameReady");
        this.aspectCor = this.StartCoroutine(this.SetAspectRatioCoroutine(isErrored, isAutoPlay));
    }

    OnFinishedPlaying()
    {
        this.TowerLog("FinishedPlaying");
        this.CaptureLastFrameCallback(this.videoWidth, this.videoHeight);
        this.videoRenderer.material = this.loadingMaterial;

        this.MoveCursorNext();

        var isURLSet = Media.SetURL(this.propID, this.urlList[this.cursor], 0, 0);
        if(isURLSet)
        {
            this.TowerLog(this.cursor + "th Video URL Set Success");
        }
        else
        {
            this.TowerLog(this.cursor + "th Video URL Set Fail");
        }
    }

    OnStalled()
    {
        this.TowerLog("Stalled");
        this.stallCor = this.StartCoroutine(this.OnStalledCoroutine);
    }

    *OnStalledCoroutine()
    {
        yield new WaitForSeconds(1.0);
        
        var res = Media.SetPlayState(this.propID, true, -1);
        this.TowerLog("Retry Play after Stalled : " + res);
        this.stallCor = null;
        this.videoState = EventType.Started;
    }

    OnUnstalled()
    {
        this.TowerLog("Unstalled");
        this.videoState = EventType.Started;
        
        if(this.stallCor != null)
        {
            this.StopCoroutine(this.stallCor);
            this.stallCor = null;
        }
    }

    OnErrorBeforeStarted()
    {
        this.TowerLog("Error Before Started");

        var isURLSet = Media.SetURL(this.propID, this.urlList[this.cursor], 0, 0);
        if(isURLSet)
        {
            this.TowerLog(this.cursor + "th Video URL Set Success");
        }
        else
        {
            this.TowerLog(this.cursor + "th Video URL Set Fail");
        }
    }

    OnErrorAfterStarted()
    {
        this.TowerLog("Error After Started");

        this.videoPrevPos = this.videoPos;
        this.CaptureLastFrameCallback(this.videoWidth, this.videoHeight);

        var isURLSet = Media.SetURL(this.propID, this.urlList[this.cursor], 0, 0);
        if(isURLSet)
        {
            this.TowerLog(this.cursor + "th Video URL Set Success");
        }
        else
        {
            this.TowerLog(this.cursor + "th Video URL Set Fail");
        }
    }

    PlayShortForm(url : string, no : number, isMute : bool)
    {
        this.cursor = 0;
        this.urlList = new Array<string>();
        this.urlList.push(url);
        this.noList = new Array<number>();
        this.noList.push(no);
        this.videoCount = 1;
        this.loadingMaterial.mainTexture = null;
        this.videoRenderer.material = this.loadingMaterial;
        this.startMuteState = isMute;
        this.videoState = -1;

        if(this.isRegister == false)
        {
            this.Register();
            if(this.isRegister == false)
            {
                this.TowerLog("Register1 Fail");
                return;
            }
            this.videoMaterial.renderQueue = this.videoRenderQueue;
            this.loadingMaterial.renderQueue = this.videoRenderQueue;
        }

        var isURLSet = Media.SetURL(this.propID, this.urlList[this.cursor], 0, 0);
        if(isURLSet)
        {
            this.TowerLog(this.cursor + "th Video URL Set Success");
        }
        else
        {
            this.TowerLog(this.cursor + "th Video URL Set Fail");
        }
    }
      
    PlayShortFormList(startIdx : int, urls : Array<string>, nos : Array<number>, isMute : bool)
    {
        this.cursor = startIdx;
        this.urlList = urls;
        this.noList = nos;
        this.videoCount = this.urlList.length;
        this.loadingMaterial.mainTexture = null;
        this.videoRenderer.material = this.loadingMaterial;
        this.startMuteState = isMute;
        this.videoState = -1;

        for(var i = 0;i<this.videoCount;i++)
        {
            this.TowerLog(this.urlList[i]);
        }

        if(this.videoCount <= 0)
        {
            this.TowerLogError("URL List is empty");
            return;
        }

        if(this.cursor >= this.videoCount)
        {
            this.TowerLogError("Start Idx is bigger than urls count");
            return;
        }

        if(this.isRegister == false)
        {
            this.Register();
            if(this.isRegister == false)
            {
                this.TowerLog("Register1 Fail");
                return;
            }
            this.videoMaterial.renderQueue = this.videoRenderQueue;
            this.loadingMaterial.renderQueue = this.videoRenderQueue;
        }

        var isURLSet = Media.SetURL(this.propID, this.urlList[this.cursor], 0, 0);
        if(isURLSet)
        {
            this.TowerLog(this.cursor + "th Video URL Set Success");
        }
        else
        {
            this.TowerLog(this.cursor + "th Video URL Set Fail");
        }
    }
    
    SetMuteState(isMute : bool)
    {
        if(this.isRegister == false)
        {
            this.TowerLog("prop is not registered");
            return;
        }

        this.startMuteState = isMute;
        let res = Media.SetMuteState(this.propID, isMute);
        this.TowerLog("SetMuteState : " + isMute + " success? : " + res);
    }
    
    *SetAspectRatioCoroutine(isErrored : bool, isAutoPlay : bool)
    {
        yield null;

        // IOS, Win인 경우 AOS와 Graphics API가 달라 Material이 거꾸로 나오기 때문에 아래의 조건문으로 판단
        if (this.videoMaterial.GetTextureOffset("_MainTex").y > 0 && Application.platform != RuntimePlatform.Android)
        {
            this.materialTurn = true;
        }
        else
        {
            this.materialTurn = false;
        }
        this.TowerLog("Material TextureOffsetY : " + this.videoMaterial.GetTextureOffset("_MainTex").y);
        this.TowerLog("Material Turn : " + this.materialTurn);

        var texture = this.videoMaterial.mainTexture;
        if(texture == null)
        {
            while(this.videoMaterial.mainTexture == null)
            {
                this.TowerLog("Wait");
                yield null;
            }
            texture = this.videoMaterial.mainTexture;
        }
        
        var strwidth = texture.width.toString();
        var textureRatio = parseFloat(strwidth) / texture.height;

        this.videoWidth = texture.width;
        this.videoHeight = texture.height;

        this.TowerLog("texture (width, height) : (" + this.videoWidth + ", " + this.videoHeight + ")");
        var tHeight = 1.0;
        var oHeight = 0.0;

        // 가로를 꽉차게 세로를 비율에 맞게 조절
        tHeight = this.baseSize.y / (this.baseSize.x / textureRatio);
        if(this.materialTurn)
        {
            tHeight = tHeight * -1;
        }
        oHeight = (1 - tHeight) / 2;

        this.TowerLog("Scale, Offset : " + tHeight + ", " + oHeight);

        this.videoMaterial.SetTextureScale("_MainTex", new Vector2(1.0, tHeight));
        this.videoMaterial.SetTextureOffset("_MainTex", new Vector2(0.0, oHeight));

        this.SetMuteState(this.startMuteState);

        var pos = 0;
        if(isErrored)
        {
            pos = this.videoPrevPos;
        }

        if(isAutoPlay)
        {
            var res = Media.SetPlayState(this.propID, true, pos);
            this.TowerLog("Set Play State on " + pos + " : " + res);
        }
        
        this.videoRenderer.material = this.videoMaterial;

        this.aspectCor = null;
    }

    ReadyNextVideo()
    {
        var next = this.cursor + 1;
        if(next >= this.videoCount)
        {
            this.TowerLog("Set First Video next");
            next = 0;
        }

        var isURLSet = Media.SetURL(this.propID, this.urlList[next], 0, 0);
        if(isURLSet)
        {
            this.TowerLog(next + "th Video URL Set Success");
        }
        else
        {
            this.TowerLog(next + "th Video URL Set Fail");
        }
    }

    MoveCursorNext()
    {
        this.cursor++;
        if(this.cursor >= this.videoCount)
        {
            this.TowerLog("Video List Finish");
            this.cursor = 0;
        }
    }

    StopShortForm()
    {
        this.TowerLog("Stop ShortForm");

        if(this.aspectCor != null)
        {
            this.StopCoroutine(this.aspectCor);
            this.aspectCor = null;
        }

        if(this.stallCor != null)
        {
            this.StopCoroutine(this.stallCor);
            this.stallCor = null;
        }

        Media.SetPlayState(this.propID, false, 0);
        Media.Unregister(this.propID);
        this.Initialize(this.videoRenderQueue);
    }

    CheckListContain(no : number) : bool
    {
        var result = false;
        this.noList.forEach(element => 
            {
                if(element == no)
                {
                    result = true;
                }
            });
        return result;
    }

    GetCurrentVideoNo() : number
    {
        if(this.cursor < 0)
        {
            return this.noList[0];
        }
        return this.noList[this.cursor];
    }
};