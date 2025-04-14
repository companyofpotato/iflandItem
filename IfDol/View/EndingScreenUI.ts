import { Lab } from 'ifland.PropEngine';
import { IFSBehaviour } from 'ifland.ScriptEngine'
import { TextMeshProUGUI } from 'TMPro';
import { GameObject } from 'UnityEngine'

export default class EndingScreenUI extends IFSBehaviour
{
    public endingCanvas : GameObject;
    public endingText : TextMeshProUGUI;
    public endingButtonText : TextMeshProUGUI;

    public Initialize(isKorean : bool)
    {
        this.SetEndingText(isKorean);
        this.SetButtonText(isKorean);
        this.endingCanvas.SetActive(false);
    }

    public ShowEndingScreen()
    {
        this.endingCanvas.SetActive(true);
    }

    public HideEndingScreen()
    {
        this.endingCanvas.SetActive(false);
    }

    private SetEndingText(isKorean : bool)
    {
        this.endingText.font = Lab.Builtin_FontAsset;
        this.endingText.spriteAsset = Lab.Builtin_SpriteAsset;
        this.endingText.outlineWidth = 0;
        if(isKorean)
        {
            this.endingText.text = "축하합니다.\n컬렉션을 완성했어요";
        }
        else
        {
            this.endingText.text = "Congratulations.\nI've completed the first collection";
        }
    }

    private SetButtonText(isKorean : bool)
    {
        this.endingButtonText.font = Lab.Builtin_FontAsset;
        this.endingButtonText.spriteAsset = Lab.Builtin_SpriteAsset;
        this.endingButtonText.outlineWidth = 0;
        if(isKorean)
        {
            this.endingButtonText.text = "확인";
        }
        else
        {
            this.endingButtonText.text = "Confirm";
        }
    }
};