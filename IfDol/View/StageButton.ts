import { Lab } from 'ifland.PropEngine';
import { IFSBehaviour } from 'ifland.ScriptEngine'
import { TextMeshProUGUI } from 'TMPro';
import { GameObject, Texture } from 'UnityEngine';
import { Image, RawImage } from 'UnityEngine.UI'

export default class StageButton extends IFSBehaviour
{
    public buttonImage : RawImage;
    public levelText : TextMeshProUGUI;
    public clearImage : Image;
    public selectionImage : RawImage;
    public activeTexture : Texture;
    public inActiveTexture : Texture;
    public lock : GameObject;
    public lockRound : Image;

    private currentText : string;

    public Initialize(stage : int, texture : Texture)
    {
        stage += 1;
        this.levelText.font = Lab.Builtin_FontAsset;
        this.currentText = "LV." + stage;
        this.buttonImage.texture = texture;
    }

    public InitializeEnding(texture : Texture)
    {
        this.currentText = "ENDING";
        this.levelText.font = Lab.Builtin_FontAsset;
        this.levelText.fontSize = 13;
        this.buttonImage.texture = texture;
        this.buttonImage.enabled = false;
    }

    public Lock()
    {
        this.levelText.text = "";
        this.clearImage.enabled = false;
        this.selectionImage.enabled = false;
        this.lock.SetActive(true);
        this.lockRound.enabled = true;
    }

    public Unlock()
    {
        this.levelText.text = this.currentText;
        this.clearImage.enabled = false;
        this.selectionImage.enabled = true;
        this.lock.SetActive(false);
        this.lockRound.enabled = false;
    }

    public UnlockEnding()
    {
        this.Unlock();
        this.buttonImage.enabled = true;
    }

    public Clear()
    {
        this.clearImage.enabled = true;
    }

    public Deselect()
    {
        this.selectionImage.texture = this.inActiveTexture;
    }

    public Select()
    {
        this.selectionImage.texture = this.activeTexture;
    }

    public CheckLocked() : bool
    {
        return this.lockRound.enabled;
    }
};