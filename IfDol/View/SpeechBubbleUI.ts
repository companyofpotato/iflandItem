import { Lab } from 'ifland.PropEngine'
import { IFSBehaviour } from 'ifland.ScriptEngine'
import { TextMeshProUGUI } from 'TMPro';
import { RectTransform, Transform, Vector2, Vector3 } from 'UnityEngine';

export default class SpeechBubbleUI extends IFSBehaviour
{
    public stageText : string;

    private canvasTransform : Transform;
    private backgroundRectTransform : RectTransform;
    private speechBubbleTMP : TextMeshProUGUI;

    public Initialize(value : int)
    {
        this.canvasTransform = this.transform.GetChild(0);
        
        this.canvasTransform.gameObject.SetActive(true);

        this.speechBubbleTMP = this.transform.GetComponentInChildren<TextMeshProUGUI>();
        this.speechBubbleTMP.font = Lab.Builtin_FontAsset;
        this.speechBubbleTMP.fontMaterial.renderQueue = value;

        this.canvasTransform.gameObject.SetActive(false);

        this.backgroundRectTransform = this.canvasTransform.GetChild(0).GetComponent<RectTransform>();
    }
    
    public ShowSpeechBubble()
    {
        this.canvasTransform.gameObject.SetActive(false);
        let text = "";
        text = Lab.GetMultilingualText(this.stageText);
        if(text.length > 0)
        {
            this.StartCoroutine(this.TextCoroutine(text));
        }
    }

    public HideSpeechBubble()
    {
        this.canvasTransform.gameObject.SetActive(false);
    }

    private *TextCoroutine(text : string)
    {
        this.speechBubbleTMP.text = text;

        yield null;

        this.canvasTransform.gameObject.SetActive(true);
        this.backgroundRectTransform.sizeDelta = new Vector2(this.speechBubbleTMP.preferredWidth + 100, 170);
    }
};