import { ShaderUtilities, TextMeshProUGUI } from 'TMPro';
import { Camera, Debug, Material, RenderTexture, Vector2 } from 'UnityEngine';
import { CanvasScaler, RawImage } from 'UnityEngine.UI';
import { Configuration, LanguageType, Lab } from 'ifland.PropEngine';
import { ECompareToken, IFSBehaviour } from 'ifland.ScriptEngine';

export default class MediaTowerCapture extends IFSBehaviour
{
    public canvasScalar : CanvasScaler;
    public captureCamera : Camera;
    public captureImage : RawImage;
    public captureTMPFirst : TextMeshProUGUI;
    public captureTMPSecond : TextMeshProUGUI;

    public videoMaterial : Material;
    public videoImage : RawImage;

    private originWidth : int = 720;
    private originHeight : int = 1280;

    private captureWidth : int;
    private captureHeight : int;

    private defaultRenderTexture : RenderTexture;
    private lastFrameRenderTexture : RenderTexture;

    TowerLog(str : string)
    {
        Debug.Log("PIID : " + this.PropInstaceID + " [MediaTower] " + str);
    }

    Initialize()
    {
        this.captureTMPFirst.font = Lab.Builtin_FontAsset;
        this.captureTMPSecond.font = Lab.Builtin_FontAsset;
       
        this.captureTMPFirst.raycastTarget = false;
        this.captureTMPFirst.UpdateFontAsset();
        this.captureTMPSecond.raycastTarget = false;
        this.captureTMPSecond.UpdateFontAsset();
        this.captureTMPFirst.text = "";
        this.captureTMPSecond.text = "";
    }

    Release()
    {
        if(this.defaultRenderTexture != null)
        {
            this.defaultRenderTexture.Release();
        }

        if(this.lastFrameRenderTexture != null)
        {
            this.lastFrameRenderTexture.Release();
        }
    }

    CaptureLastFrame(videoWidth : int, videoHeight : int, callback:(result : RenderTexture) => void)
    {
        this.videoImage.gameObject.SetActive(true);
        this.videoImage.rectTransform.sizeDelta = new Vector2(videoWidth, videoHeight);

        this.canvasScalar.referenceResolution = new Vector2(videoWidth, videoHeight);

        this.videoImage.texture = this.videoMaterial.mainTexture;

        if(this.lastFrameRenderTexture == null)
        {
            this.lastFrameRenderTexture = new RenderTexture(0, 0, 0);
        }

        this.lastFrameRenderTexture.width = videoWidth;
        this.lastFrameRenderTexture.height = videoHeight;
        this.lastFrameRenderTexture.Create();
        this.lastFrameRenderTexture.name = "[MediaTower LastFrame] ( " + videoWidth + ", " + videoHeight + ")";

        this.captureCamera.targetTexture = this.lastFrameRenderTexture;
        this.captureCamera.Render();
        RenderTexture.active = this.lastFrameRenderTexture;

        callback(this.lastFrameRenderTexture);
        
        this.captureCamera.targetTexture = null;
        this.videoImage.gameObject.SetActive(false);
    }

    ReleaseLastFrame()
    {
        if(this.lastFrameRenderTexture != null)
        {
            this.lastFrameRenderTexture.Release();
        }
    }

    *CaptureDefaultText(callback:(newOrUpdateRenderTexture : RenderTexture, tilingX : float, tilingY : float, offsetX : float, offsetY : float) => void)
	{
        this.captureImage.gameObject.SetActive(true);

        this.SetDefaultText();

        yield null;

        this.captureWidth = this.captureImage.rectTransform.rect.width;
        this.captureHeight = this.captureImage.rectTransform.rect.height;
        
        if(this.defaultRenderTexture == null)
        {
            this.defaultRenderTexture = new RenderTexture(0, 0, 0);
        }

        this.defaultRenderTexture.width = this.captureWidth;
        this.defaultRenderTexture.height = this.captureHeight;
        this.defaultRenderTexture.Create();
        this.defaultRenderTexture.name = "[MediaTower Default] ( " + this.captureWidth + ", " + this.captureHeight + ")";

        this.canvasScalar.referenceResolution = new Vector2(this.captureWidth, this.captureHeight);
        
        this.captureCamera.targetTexture = this.defaultRenderTexture;
        this.captureCamera.Render();
        RenderTexture.active = this.defaultRenderTexture;

        callback(this.defaultRenderTexture, this.originWidth / this.captureWidth, this.originHeight / this.captureHeight, -60 / this.captureWidth, -140 / this.captureHeight);

        this.captureCamera.targetTexture = null;
        this.captureImage.gameObject.SetActive(false);
    }

    //폰트 크기 고정
    SetDefaultText()
    {
        this.captureTMPFirst.text = "<color=white>" + this.GetDefaultText() + "</color>";
        this.captureTMPSecond.text = "<color=white>" + this.GetDefaultText2() + "</color>";

        this.captureTMPFirst.fontMaterial.SetFloat(ShaderUtilities.ID_FaceDilate, 0.1);
        this.captureTMPSecond.fontMaterial.SetFloat(ShaderUtilities.ID_FaceDilate, 0.1);

        if($CompareVersion("1.2.6", ECompareToken.Equal) || $CompareVersion("1.2.6", ECompareToken.OrLess))
        {
            var language2 = Configuration.GetLanguage();
            if(language2 == LanguageType.Korean)
            {
                this.captureTMPFirst.fontSize = 56;
                this.captureTMPSecond.fontSize = 40;
    
                this.captureTMPFirst.enableWordWrapping = false;
                this.captureTMPSecond.enableWordWrapping = false;
            }
            else
            {
                this.captureTMPFirst.fontSize = 56;
                this.captureTMPSecond.fontSize = 42;
                
                this.captureTMPFirst.enableWordWrapping = true;
                this.captureTMPSecond.enableWordWrapping = true;
            }
        }
        else
        {
            var language = Configuration.GetAppLanguage();
            if(language == "Korean")
            {
                this.captureTMPFirst.fontSize = 56;
                this.captureTMPSecond.fontSize = 40;
    
                this.captureTMPFirst.enableWordWrapping = false;
                this.captureTMPSecond.enableWordWrapping = false;
            }
            else
            {
                this.captureTMPFirst.fontSize = 56;
                this.captureTMPSecond.fontSize = 42;
                
                this.captureTMPFirst.enableWordWrapping = true;
                this.captureTMPSecond.enableWordWrapping = true;
            }
        }

    }
    
    GetDefaultText() : string
    {
        return Lab.GetMultilingualText("playitem_item_mediatower_shortform_notyet");
    }

    GetDefaultText2() : string
    {
        return Lab.GetMultilingualText("playitem_item_mediatower_shortform_here");
    }
}