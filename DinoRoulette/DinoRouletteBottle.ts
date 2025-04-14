import { TextMeshProUGUI } from 'TMPro'
import { Animator, GameObject, Debug, Coroutine, Camera, Transform, Vector3, Canvas, Object, RectTransform, Vector2, Material, AudioSource } from 'UnityEngine'
import { Image } from 'UnityEngine.UI'
import { iflandButton, AvatarInteractionObject } from 'ifland.PropEngine'
import { ECompareToken, IFSBehaviour } from 'ifland.ScriptEngine'

export default class DinoRouletteBottle extends IFSBehaviour
{
    nameTagBackground : GameObject
    bottleObject : GameObject
    buttonObject : GameObject
    button : iflandButton
    animator : Animator
    audioSource : AudioSource

    @SerializeField()
    private index : int

    private animLength_ms : float
    private tmp : TextMeshProUGUI
    private bgRectTransform : RectTransform
    private nameTagCoroutine : Coroutine
    private camTransform : Transform
    private nameTagEffect : GameObject
    private nameTagObject : GameObject
    private nameTagPosition : Vector3 = new Vector3(32, 2, 0)
    private nameTagEffectPosition : Vector3 = new Vector3(-32, -2, 0)

    ButtonClickedCallBack : (index : int, aio : AvatarInteractionObject) => void
    AnimEndCallback : (index : int) => void

    RouletteLog(str : string)
    {
        Debug.Log(" PIID : " + this.PropInstaceID + " [DinoRoulette] " + str)
    }

    RouletteErrorLog(str : string)
    {
        Debug.LogError(" PIID : " + this.PropInstaceID + " [DinoRoulette] " + str)
    }

    Init(nameTag : GameObject, effect : GameObject, length : float, backgroundMaterial : Material)
    {
        if(this.buttonObject == null)
        {
            this.buttonObject = this.transform.GetChild(1).gameObject
        }
        if(this.button == null)
            this.button = this.buttonObject.GetComponent<iflandButton>()
        
        if(this.button == null)
            this.RouletteErrorLog("No iflandButton")
        else
            this.button.OnClick.AddListener((aio) => {this.OnClickButton(aio)})
        this.index = parseInt(this.buttonObject.name)
        this.index--

        this.nameTagEffect = effect
        this.animLength_ms = length

        if(this.bottleObject == null)
        {
            this.bottleObject = this.transform.GetChild(0).gameObject
        }

        if(nameTag != null)
        {
            this.nameTagObject = Object.Instantiate(nameTag, this.nameTagBackground.transform) as GameObject
            if(this.nameTagObject != null)
            {
                this.nameTagObject.SetActive(true)
                this.tmp = this.nameTagObject.GetComponentInChildren<TextMeshProUGUI>()
                this.bgRectTransform = this.nameTagBackground.GetComponent<RectTransform>()
                this.nameTagObject.GetComponent<RectTransform>().localPosition = this.nameTagPosition
            }
        }
        else
        {
            this.tmp = null;
        }

        if(this.animator == null)
            this.animator = this.gameObject.GetComponent<Animator>()
        if(this.audioSource == null)
            this.audioSource = this.gameObject.GetComponent<AudioSource>()
        this.nameTagCoroutine = null
        this.camTransform = Camera.main.transform

        var canvas = this.nameTagBackground.transform.parent.GetComponent<Canvas>()
        if(canvas != null)
        {
            canvas.worldCamera = Camera.main
        }

        if(backgroundMaterial != null)
        {
            this.nameTagBackground.GetComponent<Image>().material = backgroundMaterial
        }

        this.SetNameTagActive(false)
        this.SetBottleActive(false)
    }

    OnClickButton(aio: AvatarInteractionObject)
    {
        this.ButtonClickedCallBack(this.index, aio)
    }

    SetButtonVisible(state : bool)
    {
        this.button.isVisable = state
    }

    Add(nickname : string, gap : number)
    {
        if(gap < 0)
            gap = 0
        if(this.tmp != null)
        {
            this.StartCoroutine(this.ChangeSizeCoroutine(nickname))
        }
        if(this.animator == null)
        {
            this.RouletteErrorLog("No Animator")
        }
        else
        {
            var ratio = gap / this.animLength_ms
            this.RouletteLog("Bottle Ratio : " + ratio)
            if(ratio > 0.7)
            {
                this.RouletteLog("Skip BottleAnim")
                this.animator.Play("EndMove", -1, 0.0)
                this.nameTagEffect.SetActive(false)
                this.audioSource.enabled = false
                this.AnimEndCallback(this.index)
            }
            else 
            {
                if(ratio > 0.0) // 놏친 이벤트 활성화
                {
                    if(ratio < 0.5)
                        this.OnMoveStartEvent()
                }
                this.animator.Play("BottleMove", -1, ratio)
            }
        }
    }

    *ChangeSizeCoroutine(nickname : string)
    {
        this.SetNameTagActive(true)
        this.tmp.text = nickname
        yield null
        this.RouletteLog("NameTag BG Width : " + (this.tmp.preferredWidth + 120))
        this.bgRectTransform.sizeDelta = new Vector2(this.tmp.preferredWidth + 120, this.bgRectTransform.rect.height)
    }

    CancelAnim()
    {
        this.animator.Play("Idle", -1, 0.0)
    }

    SetBottle(nickname : string)
    {
        this.RouletteLog("Set Bottle index : " + this.index)
        if(this.tmp != null)
        {
            this.StartCoroutine(this.ChangeSizeCoroutine(nickname))
        }
        this.animator.Play("EndMove", -1, 0.0)
        this.SetNameTagActive(true)
    }

    SetNameTagEffect()
    {
        this.RouletteLog("Set NameTag Effect")
        this.nameTagEffect.SetActive(false)
        this.nameTagEffect.transform.SetParent(this.nameTagObject.transform)
        this.nameTagEffect.SetActive(true)
        if(this.nameTagCoroutine == null)
        {
            this.nameTagCoroutine = this.StartCoroutine(this.NameTagRotationCoroutine())
        }
        this.nameTagEffect.transform.localPosition = this.nameTagEffectPosition
        this.nameTagEffect.transform.localEulerAngles = Vector3.zero
    }

    SetBottleActive(state : bool)
    {
        this.animator.Play("Idle", -1, 0.0)
        this.bottleObject.SetActive(state)
    }

    OnMoveStartEvent()
    {
        this.RouletteLog("OnMoveStart")
        this.SetNameTagEffect()
    }

    OnMoveEndEvent()
    {
        this.RouletteLog("OnMoveEnd")
        this.nameTagEffect.SetActive(false)
        this.audioSource.enabled = false
        this.AnimEndCallback(this.index);
    }

    OnMoveAudio()
    {
        this.audioSource.enabled = true
    }

    SetNameTagActive(state : bool)
    {
        if(this.nameTagBackground == null)
        {
            this.RouletteErrorLog("No NameTagBackground")
            return
        }
        this.nameTagBackground.SetActive(state)
        if(state)
        {
            if(this.nameTagCoroutine == null)
                this.nameTagCoroutine = this.StartCoroutine(this.NameTagRotationCoroutine())
        }
        else
        {
            if(this.nameTagCoroutine != null)
            {
                this.StopCoroutine(this.nameTagCoroutine)
                this.nameTagCoroutine = null
            }
        }
    }

    *NameTagRotationCoroutine()
    {
        if($CompareVersion("1.2.5", ECompareToken.OrMore))
        {
            while(true)
            {
                this.nameTagEffect.transform.rotation = this.camTransform.rotation
                yield null
            }
        }
        else
        {
            while(true)
            {
                this.nameTagBackground.transform.rotation = this.camTransform.rotation
                yield null
            }
        }
    }
};