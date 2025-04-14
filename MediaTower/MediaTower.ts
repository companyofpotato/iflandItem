import { Debug, GameObject, Material, Texture2D, Vector2 } from 'UnityEngine';
import { IFSBehaviour } from 'ifland.ScriptEngine';
import MediaTowerAPI from './MediaTowerAPI';
import MediaTowerNative from './MediaTowerNative';
import MediaTowerVideo from './MediaTowerVideo';
import { CustomButton, MultiPlay, Players, PropDescriptor, Props, iflandButton, PropMetadata, Lab } from 'ifland.PropEngine';
import MediaTowerCapture from './MediaTowerCapture';
import MediaTowerVideoData from './MediaTowerVideoData';

class SyncData
{
    count : int;
}

export default class MediaTower extends IFSBehaviour
{
    public towerMaterial : Material;
    public defaultTextMaterial : Material;
    public gridMaterial : Material;
    public propDescriptor : PropDescriptor;
    public distance : float;
    public customButton : CustomButton;
    public audioButton : iflandButton;
    public defaultText : GameObject;
    
    public mediaTowerAPI : MediaTowerAPI;
    public mediaTowerNative : MediaTowerNative;
    public mediaTowerVideo : MediaTowerVideo;
    public mediaTowerCapture : MediaTowerCapture;

    public onImage : Texture2D;
    public offImage : Texture2D;
    
    private renderQueueDefault : int = 3000;
    private defaultVideoURL : string = "https://jumpvrapi-mscdn-api-live.azureedge.net/blobpublic-live/attach_v2/2024/03/175512/175512_1_5696.mp4";
    
    private disabled : bool;
    private isEmpty : bool;
    private isMute : bool;
    private originMuteState : bool;
    private localSyncData : SyncData;
    private videoCount : int;
    private isOn : bool;

    private curVideoData : MediaTowerVideoData = new MediaTowerVideoData();

    private savedCount : int = -1;

    TowerLog(str : string)
    {
        Debug.Log("PIID : " + this.PropInstaceID + " [MediaTower] " + str);
    }

    Awake()
    {
        this.disabled = false;
    }

    OnPropActivate()
    {
        this.TowerLog("Activate");
        this.Initailize();
        this.EditRenderQueue();
    }

    OnPropDeactivate()
    {
        this.TowerLog("Deactivate");
        this.mediaTowerAPI.RequestShortFormListCallback = null;
        this.mediaTowerNative.ShortFormEditCallback = null;
        this.mediaTowerNative.SoundModeChangeCallback = null;
        this.mediaTowerNative.ListenToSoundModeChangeCallback = null;
        this.mediaTowerCapture.Release();
        this.StopVideo();
    }

    OnEnable()
    {
        this.defaultText.SetActive(false);
        if(this.PropInstaceID < 0)
        {
            return;
        }
        this.TowerLog("MediaTower OnEnable");
        if(this.disabled)
        {
            this.disabled = false;
            this.PlayVideoList();
        }
    }

    OnDisable()
    {
        if(this.PropInstaceID < 0)
        {
            return;
        }
        this.TowerLog("MediaTower OnDisable");
        this.disabled = true;
    }

    Initailize()
    {
        this.isMute = true;
        this.originMuteState = true;

        this.mediaTowerAPI.RequestShortFormListCallback = this.RequestShortFormListCallback;

        this.mediaTowerNative.Initialize();
        this.mediaTowerNative.ShortFormEditCallback = this.OnShortFormUpdate;
        this.mediaTowerNative.SoundModeChangeCallback = this.OnSoundModeChanged;
        this.mediaTowerNative.ListenToSoundModeChangeCallback = this.OnListenToSoundModeChanged;

        this.mediaTowerVideo.Initialize(this.renderQueueDefault - 2);
        this.mediaTowerVideo.CaptureLastFrameCallback = this.CaptureLastFrame;
        this.mediaTowerVideo.ReleaseLastFrameCallback = this.ReleaseLastFrame;

        this.audioButton.isVisable = false;

        this.customButton.OnClick.AddListener((player) =>
        {
            let json =
            {
                eventName : "TAP_MEDIA_TOWER",
                roomDataNeeded :true,
                parameters : []
            };
    
            Lab.SendIGFEvent("NTY_LOG_EVENT_AMPLITUDE", JSON.stringify(json), (result : string) => 
            {
                this.TowerLog("Amplitude log result : " + result);
            });

            this.OnClickMediaTower();
        });

        this.audioButton.OnClick.AddListener((player) =>
        {
            let json =
            {
                eventName : "TAP_MEDIA_TOWER_SOUND_ON",
                roomDataNeeded :true,
                parameters : []
            };

            if(!this.isMute)
            {
                json.eventName = "TAP_MEDIA_TOWER_SOUND_OFF";
            }

            Lab.SendIGFEvent("NTY_LOG_EVENT_AMPLITUDE", JSON.stringify(json), (result : string) => 
            {
                this.TowerLog("Amplitude log result : " + result);
            });

            this.SetVideoMute(!this.isMute);
        });
        this.audioButton.SetButtonImage(this.onImage);

        this.videoCount = 1;
    
        this.PropSettingLoad();

        // this.videoCount = 3;

        this.CaptureDefaultText();

        this.localSyncData = new SyncData;

        this.propDescriptor.gameObject.SetActive(this.isOn);
    }

    PropSettingLoad()
    {
        let settingData = Props.GetPropMetadata(this.PropInstaceID);

        if(settingData != null)
        {
            this.videoCount = this.GetSettingData(settingData, "VideoCount");
            if(this.videoCount == undefined)
            {
                this.TowerLog("VideoCount undefined");
                this.videoCount = 1;
            }
            this.TowerLog("VideoCount : " + this.videoCount);

            this.isOn = this.GetSettingData(settingData, "IsOn");
            if(this.isOn == undefined)
            {
                this.TowerLog("IsOn undefined");
                this.isOn = true;
            }
            this.TowerLog("IsOn : " + this.isOn);
        }
    }

    CaptureDefaultText()
    {
        this.mediaTowerCapture.Initialize();
        this.StartCoroutine(this.mediaTowerCapture.CaptureDefaultText((result, tilingX, tilingY, offsetX, offsetY) =>
        {
            this.TowerLog("Complete : " + result.name);
            this.defaultTextMaterial.mainTexture = result;

            this.defaultTextMaterial.SetTextureScale("_MainTex", new Vector2(tilingX, tilingY));
            this.defaultTextMaterial.SetTextureOffset("_MainTex", new Vector2(offsetX, offsetY));
        }));
    }

    CaptureLastFrame(width : int, height : int)
    {
        this.mediaTowerCapture.CaptureLastFrame(width, height, (result) =>
        {
            this.TowerLog("Complete : " + result.name);
            this.mediaTowerVideo.loadingMaterial.mainTexture = result;
        });
    }

    ReleaseLastFrame()
    {
        this.mediaTowerCapture.ReleaseLastFrame();
    }

    GetSettingData(metadata: PropMetadata, valueKey: string): any
    {
        if (metadata == null)
        {
            return undefined;
        }
        if (valueKey == null || valueKey == undefined)
        {
            return undefined;
        }
        if (metadata.VariantValueKeys.includes(valueKey) == true)
        {
            return metadata.GetVariant(valueKey);
        }
        else
        {
            return undefined;
        }
    }

    SetVideoMute(setMute : bool)
    {
        if(setMute)
        {
            this.isMute = true;
            this.audioButton.SetButtonImage(this.onImage);
        }
        else
        {
            if(this.mediaTowerNative.CheckAudioOn())
            {
                this.isMute = false;
                this.audioButton.SetButtonImage(this.offImage);
            }
            else
            {
                this.mediaTowerNative.ShowAudioRetryToast();
            }
        }
        this.mediaTowerVideo.SetMuteState(this.isMute);
    }

    EditRenderQueue()
    {
        this.towerMaterial.renderQueue = this.renderQueueDefault;
        this.mediaTowerVideo.videoMaterial.renderQueue = this.renderQueueDefault - 2;
        this.mediaTowerVideo.loadingMaterial.renderQueue = this.renderQueueDefault - 2;
        this.defaultTextMaterial.renderQueue = this.renderQueueDefault - 1;
        this.gridMaterial.renderQueue = this.renderQueueDefault;
    }

    PlaySpecificVideo(no : number)
    {
        this.StopVideo();
        this.RequestShortFormListCallback(this.curVideoData, no);
    }

    PlayVideoList()
    {
        if(this.isOn == false)
        {
            return;
        }

        this.TowerLog("PlayVideoList");
        this.mediaTowerAPI.RequestShortFormList(this.videoCount);
    }

    StopVideo()
    {
        this.defaultText.SetActive(false);
        this.mediaTowerVideo.StopShortForm();
    }

    RequestShortFormListCallback(videoData : MediaTowerVideoData, startNo : number = -1)
    {
        this.isEmpty = false;
        if(videoData.GetLength() == 0)
        {
            this.isEmpty = true;
            this.TowerLog("No ShortForm Video");
            videoData.Push(-1, this.defaultVideoURL);
        }
        
        this.audioButton.isVisable = !this.isEmpty;
        this.defaultText.SetActive(this.isEmpty);

        this.curVideoData = videoData;
        
        if(videoData.GetLength() == 1)
        {
            this.mediaTowerVideo.PlayShortForm(videoData.GetURLByIdx(0) + "#loop", videoData.GetNoByIdx(0), this.isMute);
        }
        else
        {
            this.mediaTowerVideo.PlayShortFormList(videoData.SetStartIdxByNo(startNo), videoData.GetURLList(), videoData.GetNoList(), this.isMute);
        }
    }

    OnSoundModeChanged(isMute : bool)
    {
        if(isMute)
        {
            this.originMuteState = this.isMute;
            this.SetVideoMute(true);
        }
        else
        {
            this.SetVideoMute(this.originMuteState);
        }
    }

    OnListenToSoundModeChanged(isListenToSound : bool)
    {
        if(this.isMute == false)
        {
            this.mediaTowerVideo.SetMuteState(!isListenToSound);
        }
    }

    OnShortFormUpdate(key : string, id : number)
    {
        this.TowerLog("ShortForm " + id + " " + key);
        switch(key)
        {
            case "POST_ADDED" : 
                this.mediaTowerAPI.CheckShortForm(id, (success : bool, isShortForm : bool) =>
                {
                    if(success)
                    {
                        if(isShortForm)
                        {
                            this.TowerLog(id + " is ShortForm");
                            this.localSyncData.count = this.savedCount + 1;
                            MultiPlay.Sync(this, this.localSyncData);
                        }
                        else
                        {
                            this.TowerLog(id + " is not ShortForm");
                        }
                    }
                    else
                    {
                        this.TowerLog("Check ShortForm Fail");
                    }
                })
                break;
            case "POST_UPDATED" : 
            case "POST_DELETED" : 
                if(this.mediaTowerVideo.CheckListContain(id))
                {
                    this.TowerLog(id + " On the List");
                    this.localSyncData.count = this.savedCount + 1;
                    MultiPlay.Sync(this, this.localSyncData);
                }
                else
                {
                    this.TowerLog(id + " Not on the List");
                }
                break
            case "SHORTFORM_CLOSE" : 
                Props.NotifyPropEndInteraction(this.propDescriptor, this.GameObjectInstanceID, Players.GetMyUserIdx());
                this.PlaySpecificVideo(id);
                break;
            default : 
                break;
        }
    }

    OnSync(serverData : SyncData)
    {
        this.savedCount = serverData.count;
        this.TowerLog("OnSync : " + serverData.count);
        this.StopVideo();
        this.PlayVideoList();
    }

    OnSyncServer(serverData : SyncData)
    {
        if(serverData == null) // 영상 업데이트 이벤트가 호출된 적이 없음
        {
            if(this.savedCount < 0) // 이프홈 입장할 때 토탈스냅샷
            {
                this.TowerLog("OnSyncServer Data is null");
                this.savedCount = 0;
                this.PlayVideoList();
                return;
            }
            else // 이프홈 입장이 완료된 상태에 토탈스냅샷
            {
                this.TowerLog("OnSyncServer Data is null but Skip");
                return;
            }
        }
        else // 영상 업데이트 이벤트가 호출된 적이 있음
        {
            if(this.savedCount >= serverData.count) // 수신한 적 있는 이벤트 토탈스냅샷 적용
            {
                this.TowerLog("OnSyncServer Skip");
                return;
            }
            else // 이프홈 입장하면서 토탈스냅샷 적용, 또는 수신한 적 없는 이벤트 토탈스냅샷 적용
            {
                this.savedCount = serverData.count;
                this.TowerLog("OnSyncServer : " + serverData.count);
                this.StopVideo();
                this.PlayVideoList();
            }
        }
    }
    
    OnClickMediaTower()
    {
        var def = this.customButton.InDistance(this.distance);
        this.TowerLog("avatar in distance : " + def);
        if(def)
        {
            if(this.isEmpty)
            {
                this.mediaTowerNative.ShowShortForm(-1);
            }
            else
            {
                Props.NotifyPropStartInteraction(this.propDescriptor, this.GameObjectInstanceID, Players.GetMyUserIdx());
    
                this.mediaTowerNative.ShowShortForm(this.mediaTowerVideo.GetCurrentVideoNo());
            }
        }
    }

    OnCloseShortForm(id : int)
    {
        this.TowerLog("ShortForm " + id + " Closed");
    }
}