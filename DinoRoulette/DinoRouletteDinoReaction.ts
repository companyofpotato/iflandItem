import { TextMeshProUGUI } from 'TMPro'
import { Debug, Animator, Coroutine, GameObject, AudioClip, Sprite, AudioSource, Transform, Camera, Canvas, Vector3, Quaternion, RectTransform, Vector2, Object, Material} from 'UnityEngine'
import { Image } from 'UnityEngine.UI'
import { AvatarInteractionObject, Players } from 'ifland.PropEngine'
import { ECompareToken, IFSBehaviour } from 'ifland.ScriptEngine'

export default class DinoRouletteDinoReaction extends IFSBehaviour
{
    animator : Animator
    emoticonAnimator : Animator
    private camTransform : Transform
    private pushedAIO : AvatarInteractionObject
    private dinoCoroutine : Coroutine
    private nameTagCoroutine : Coroutine

    emoticonImage : Image
    emoticonAudio : AudioSource
    private emoticonCoroutine : Coroutine

    private avatarPosition : Vector3
    private rotateVector : Vector3
    private tmpVector : Vector3
    private headDegree : number

    private minDegree : float
    private maxDegree : float
    private shakeDefault : Quaternion = Quaternion.Euler(0, 0, 13)
    private fireDefault : Quaternion = Quaternion.Euler(0, 0, -66)
    private headDegreeOffset : float = 24.573 // 90 - 66.427 : 90도는 반대각 계산을 위해 사용, 66.427은 공룡 머리가 정방향을 볼 때의 각도 값

    private nameTagObject : GameObject
    private tmp : TextMeshProUGUI
    private rectTransform : RectTransform
    private nameTagPosition : Vector3 = new Vector3(32, 2, 0)
    private nameTagEffectPosition : Vector3 = new Vector3(-32, -2, 0)

    private userExist : bool
    private lastPosition : Vector3
    private winnerNickname : string

    avatarShakeBuiltInAnimation : string
    avatarFireBuiltInAnimation : string

    dinoWholeTransform : Transform
    dinoHeadTransform : Transform

    nameTagBackground : GameObject
    nameTagEffect : GameObject

    burningScreen : GameObject

    dinoEmoticon : GameObject
    audioClips : AudioClip[];
    emoticonSprites : Sprite[];

    shakeAnimLength_ms : int
    fireAnimLength_ms : int
    resetAnimLength_ms : int

    ShakeAnimEndCallback : () => void
    FireAnimEndCallback : () => void

    RouletteLog(str : string)
    {
        Debug.Log(" PIID : " + this.PropInstaceID + " [DinoRoulette] " + str)
    }

    RouletteErrorLog(str : string)
    {
        Debug.LogError(" PIID : " + this.PropInstaceID + " [DinoRoulette] " + str)
    }

    Init(nameTag : GameObject, backgroundMaterial : Material)
    {
        this.minDegree = -90
        this.maxDegree = -30

        this.shakeAnimLength_ms = 2000
        this.fireAnimLength_ms = 2333
        this.resetAnimLength_ms = 1000

        if(this.dinoEmoticon != null)
        {
            this.SetDinoEmoticonActive(false)
            if(this.emoticonImage == null)
                this.emoticonImage = this.dinoEmoticon.GetComponent<Image>()
            if(this.emoticonAudio == null)
                this.emoticonAudio = this.dinoEmoticon.GetComponent<AudioSource>()
        }
        else
        {
            this.RouletteErrorLog("No DinoEmoticon GameObject")
        }

        if(nameTag != null)
        {
            this.nameTagObject = Object.Instantiate(nameTag, this.nameTagBackground.transform) as GameObject
            this.nameTagObject.SetActive(true)
            this.tmp = this.nameTagObject.GetComponent<TextMeshProUGUI>()
            this.rectTransform = this.nameTagBackground.GetComponent<RectTransform>()
            this.nameTagEffect.transform.SetParent(this.nameTagObject.transform)
            this.nameTagEffect.transform.localPosition = this.nameTagEffectPosition
            this.nameTagEffect.transform.localEulerAngles = Vector3.zero
            this.nameTagObject.GetComponent<RectTransform>().localPosition = this.nameTagPosition
        }
        else
        {
            this.tmp = null
            this.RouletteLog("No nameTag");
        }

        if(this.animator == null)
            this.animator = this.gameObject.GetComponent<Animator>()
        this.camTransform = Camera.main.transform

        var canvas = this.gameObject.GetComponentInChildren<Canvas>()
        if(canvas != null)
        {
            canvas.worldCamera = Camera.main
        }

        if(backgroundMaterial != null)
        {
            this.nameTagBackground.GetComponent<Image>().material = backgroundMaterial
        }
        else
        {
            this.RouletteLog("No backgroundMaterial");
        }
        this.dinoCoroutine = null
        this.nameTagCoroutine = null
        this.emoticonCoroutine = null
        this.SetNameTagActive(false)
    }

    PlayWin(gap : int, userIdx : int, nickname : string)
    {
        this.RouletteLog("Win")
        this.ResetAll();
        this.winnerNickname = ""
        this.winnerNickname = nickname
        this.pushedAIO = Players.GetPlayer(userIdx)
        if(this.pushedAIO == null)
        {
            this.RouletteErrorLog("Win AIO is null")
            this.userExist = false
        }
        else
        {
            this.userExist = true
        }

        if(this.animator == null)
        {
            this.RouletteErrorLog("No Animator")
        }
        else
        {
            this.animator.Play("Idle", -1, 0.0)
            if(gap > this.fireAnimLength_ms)
            {
                this.RouletteLog("Skip FireAnim")
                this.OnFireEndEvent()
            }
            else
            {
                var ratio = gap / this.fireAnimLength_ms
                this.RouletteLog("Fire Ratio : " + ratio)
                if(ratio < 0.1) // 머리 내미는 중이라면 처음부터 시작
                    this.animator.Play("Fire", -1, 0.0)
                else if(ratio > 0.9) // 머리 들어가는 중이라면 생략
                    this.OnFireEndEvent()
                else
                {
                    this.OnFireStartEvent()
                    this.animator.Play("Fire", -1, ratio)
                }
            }
        }
    }

    PlayNotWin(gap : int, userIdx : int)
    {
        this.RouletteLog("Not Win")
        this.ResetAll();
        this.pushedAIO = Players.GetPlayer(userIdx)
        if(this.pushedAIO == null)
        {
            this.RouletteErrorLog("not Win AIO is null")
            this.userExist = false
        }
        else
        {
            this.userExist = true
        }

        if(this.animator == null)
        {
            this.RouletteErrorLog("No Animator")
        }
        else
        {
            this.animator.Play("Idle", -1, 0.0)
            if(gap > this.shakeAnimLength_ms)
            {
                this.RouletteLog("Skip ShakeAnim")
                this.OnShakeEndEvent()
            }
            else
            {
                var ratio = gap / this.shakeAnimLength_ms
                this.RouletteLog("Shake Ratio : " + ratio)
                if(ratio < 0.15) // 머리 내미는 중이라면 처음부터 시작
                    this.animator.Play("Shake", -1, 0.0)
                else if(ratio > 0.9) // 머리 들어가는 중이라면 생략
                    this.OnShakeEndEvent()
                else
                {
                    this.OnShakeStartEvent()
                    if(0.2 < ratio && ratio < 0.5)
                        this.OnShowDinoEmoticonEvent()
                    this.animator.Play("Shake", -1, ratio)
                }
            }
        }
    }

    PlayReset() : bool
    {
        if(this.animator == null)
        {
            this.RouletteErrorLog("No Animator")
            return false
        }

        var info = this.animator.GetCurrentAnimatorStateInfo(0)

        if(info.IsName("Reset")) // 중복 재생 방지
        { 
            this.RouletteLog("Fail to play Reset")
            return false 
        }
        else
        {
            this.RouletteLog("Success to play Reset")
            this.ResetAll()
            this.animator.Play("Reset", -1, 0)
            return true
        }
        
    }

    *DinoLookCoroutine(isWin : bool)
    {
        this.rotateVector = new Vector3()
        if(!isWin)
            this.dinoHeadTransform.localRotation = this.shakeDefault
        else
            this.dinoHeadTransform.localRotation = this.fireDefault
        while(true)
        {
            if(this.userExist)
                this.avatarPosition = this.pushedAIO.GetWorldPosition()
            else
                this.avatarPosition = this.lastPosition
            this.rotateVector = Vector3.op_Subtraction(this.dinoWholeTransform.position, this.avatarPosition)
            this.rotateVector.y = 0
            this.dinoWholeTransform.forward = this.rotateVector
            this.dinoWholeTransform.localRotation = Quaternion.Euler(0, this.dinoWholeTransform.localRotation.eulerAngles.y, 0)

            if(isWin)
            {
                this.tmpVector = this.rotateVector
                this.tmpVector.y = this.avatarPosition.y - 0.5
                this.headDegree = Vector3.SignedAngle(this.transform.up, this.rotateVector, this.tmpVector)
                this.headDegree = this.headDegreeOffset - this.headDegree

                if(this.headDegree < this.minDegree)
                    this.headDegree = this.minDegree
                if(this.headDegree > this.maxDegree)
                    this.headDegree = this.maxDegree

                this.dinoHeadTransform.localRotation = Quaternion.Euler(0, 0, this.headDegree)
            }

            yield null
        }
    }

    SetNameTagActive(state : bool)
    {
        this.RouletteLog("Set NameTag Active : " + state)
        if(this.nameTagBackground == null)
        {
            this.RouletteErrorLog("No NameTagBackground")
            return
        }
        this.nameTagBackground.SetActive(state)
        this.nameTagEffect.SetActive(state)
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

    ShowDinoEmoticon()
    {
        this.RouletteLog("Show Emoticon")
        var idx = Math.floor(Math.random() * 3)
        if(this.emoticonAudio != null)
            this.emoticonAudio.clip = this.audioClips[idx]
        if(this.emoticonImage != null)
            this.emoticonImage.sprite = this.emoticonSprites[idx]
        this.emoticonAnimator.Play("EmoticonShow", -1, 0);
        this.SetDinoEmoticonActive(true)
    }

    SetDinoEmoticonActive(state : bool)
    {
        if(this.dinoEmoticon == null)
        {
            this.RouletteErrorLog("No DinoEmoticon")
            return
        }
        this.dinoEmoticon.SetActive(state)
        if(state)
        {
            if(this.emoticonCoroutine == null)
                this.emoticonCoroutine = this.StartCoroutine(this.DinoEmoticonCoroutine())
        }
        else
        {
            if(this.emoticonCoroutine != null)
            {
                this.StopCoroutine(this.emoticonCoroutine)
                this.emoticonCoroutine = null
            }
        }
    }

    *DinoEmoticonCoroutine()
    {
        while(true)
        {
            this.dinoEmoticon.transform.rotation = this.camTransform.rotation
            yield null
        }
    }

    HideDinoEmoticon()
    {
        this.RouletteLog("Hide Emoticon")
        this.SetDinoEmoticonActive(false)
    }

    StopDinoLookCoroutine()
    {
        if(this.dinoCoroutine != null)
        {
            this.StopCoroutine(this.dinoCoroutine)
            this.dinoCoroutine = null
            this.RouletteLog("DinoLookCoroutine Stop")
        }
    }

    OnShakeStartEvent()
    {
        this.RouletteLog("ShakeAnim Start")
        if(this.pushedAIO != null && this.pushedAIO == Players.GetMyPlayer())
            this.pushedAIO.PlayBuiltInAnimation(this.avatarShakeBuiltInAnimation)
        if(this.dinoCoroutine != null)
        {
            this.StopCoroutine(this.dinoCoroutine);
            this.dinoCoroutine = null;
        }
        this.dinoCoroutine = this.StartCoroutine(this.DinoLookCoroutine(false))
    }

    OnShowDinoEmoticonEvent()
    {
        this.ShowDinoEmoticon()
    }

    OnShakeEndEvent()
    {
        this.RouletteLog("ShakeAnim End")
        this.StopDinoLookCoroutine()
        this.HideDinoEmoticon()
        this.ShakeAnimEndCallback()
    }

    OnFireStartEvent()
    {
        this.RouletteLog("FireAnim Start")
        if(this.pushedAIO != null && this.pushedAIO == Players.GetMyPlayer())
            this.pushedAIO.PlayBuiltInAnimation(this.avatarFireBuiltInAnimation)
        if(this.dinoCoroutine != null)
        {
            this.StopCoroutine(this.dinoCoroutine);
            this.dinoCoroutine = null;
        }
        this.dinoCoroutine = this.StartCoroutine(this.DinoLookCoroutine(true))
        if(this.tmp != null)
        {
            this.RouletteLog("Change nametag : " + this.winnerNickname)
            this.StartCoroutine(this.ChangeSizeCoroutine(this.winnerNickname))
        }
        this.SetNameTagActive(true)
        if(this.pushedAIO != null)
        {
            if(Players.GetMyUserIdx() == this.pushedAIO.GetUserIdx())
            {
                if(this.burningScreen != null)
                    this.burningScreen.SetActive(true)
            }
        }
    }

    *ChangeSizeCoroutine(nickname : string)
    {
        this.tmp.text = nickname
        yield null
        this.rectTransform.sizeDelta = new Vector2(this.tmp.preferredWidth + 120, this.rectTransform.rect.height)
    }

    OnFireEndEvent()
    {
        this.RouletteLog("FireAnim End")
        this.StopDinoLookCoroutine()
        if(this.pushedAIO != null)
        {
            if(Players.GetMyUserIdx() == this.pushedAIO.GetUserIdx())
            {
                if(this.burningScreen != null)
                    this.burningScreen.SetActive(false)
            }
        }
        this.SetNameTagActive(false)
        this.FireAnimEndCallback()
    }

    ResetAll()
    {
        this.RouletteLog("Reset DinoReaction")
        this.StopDinoLookCoroutine()
        this.HideDinoEmoticon()
        if(this.pushedAIO != null)
        {
            if(Players.GetMyUserIdx() == this.pushedAIO.GetUserIdx())
            {
                if(this.burningScreen != null)
                    this.burningScreen.SetActive(false)
            }
        }
        this.SetNameTagActive(false)
        if(this.animator != null)
            this.animator.Play("Idle", -1, 0)
    }
    
    OnLeaveUser(userIdx : int)
    {
        this.RouletteLog("OnLeaveUser : " + userIdx);
        if(this.pushedAIO != null && this.pushedAIO.GetUserIdx() == userIdx)
        {
            this.lastPosition = this.pushedAIO.GetWorldPosition();
            this.userExist = false;
            this.RouletteLog("Interacted User Leave : " + userIdx + " in " + this.lastPosition)
        }
    }
};