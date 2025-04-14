import { Lab } from 'ifland.PropEngine';
import { IFSBehaviour } from 'ifland.ScriptEngine'
import { TextMeshProUGUI } from 'TMPro'
import { Coroutine, Debug, GameObject, RectTransform, Transform, Vector2, Vector3 } from 'UnityEngine';
import { Button } from 'UnityEngine.UI';

export default class InteractionUI extends IFSBehaviour
{
    public scoreTMP : TextMeshProUGUI;
    public stageTMP : TextMeshProUGUI;
    public fillRect : RectTransform;
    public processBar : GameObject;
    public maxSize : Vector2;
    public glowObject : GameObject;
    public buttonPivot : Transform;
    public interactionButton : Button;
    public minSize : float;

    private glowCoroutine : Coroutine;

    public Initialize(value : int)
    {
        this.scoreTMP.font = Lab.Builtin_FontAsset;
        this.stageTMP.font = Lab.Builtin_FontAsset;

        this.scoreTMP.fontMaterial.renderQueue = value + 1;
        this.stageTMP.fontMaterial.renderQueue = value + 1;

        this.glowObject.transform.localScale = Vector3.zero;
    }

    public SetContent(score : int, unlockScore : int, prevUnlockScore : int, stage : int)
    {
        let x = 0;
        let y = this.maxSize.y;
        score -= prevUnlockScore;
        unlockScore -= prevUnlockScore;
        if(score >= unlockScore)
        {
            this.scoreTMP.SetText(unlockScore.toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ",") + "/" + unlockScore.toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ","));
            x = this.maxSize.x;
        }
        else
        {
            this.scoreTMP.SetText(score.toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ",") + "/" + unlockScore.toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ","));
            if(unlockScore != 0)
            {
                x = this.maxSize.x * (score / unlockScore);
            }
            else
            {
                Debug.Log("[IFDol] unlock is same with preUnlock when score is lower than unlockScore");
            }
        }
        this.fillRect.sizeDelta = new Vector2(this.minSize + x, y);

        this.stageTMP.SetText("LV " + stage);
    }

    public SetPositionY(value : float)
    {
        this.transform.localPosition = new Vector3(this.transform.localPosition.x, value, 0);
    }

    public PlayInteractionGlowEffect()
    {
        if(this.glowCoroutine != null)
        {
            this.StopCoroutine(this.glowCoroutine);
        }
        this.glowCoroutine = this.StartCoroutine(this.GlowCoroutine());
    }

    *GlowCoroutine()
    {
        this.glowObject.transform.localScale = Vector3.zero;
        let value = 0.01;
        while(value < 1)
        {
            yield null
            this.glowObject.transform.localScale = new Vector3(value, value, value);
            value += 0.005;
        }
        this.glowObject.transform.localScale = new Vector3(1, 1, 1);

        while(value > 0)
        {
            yield null
            this.glowObject.transform.localScale = new Vector3(value, value, value);
            value -= 0.005;
        }
        this.glowObject.transform.localScale = Vector3.zero;

        this.glowCoroutine = null;
    }

    public HideUIByEnding()
    {
        this.processBar.SetActive(false);
        this.buttonPivot.localPosition = new Vector3(-150, 0, 0);
    }

    public EnableButton()
    {
        this.interactionButton.interactable = true;
    }

    public DisableButton()
    {
        this.interactionButton.interactable = false;
    }
};