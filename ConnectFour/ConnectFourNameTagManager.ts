import { TextMeshProUGUI } from 'TMPro';
import { Animator, Camera, Coroutine, Debug, GameObject, Material, Object, Quaternion, RectTransform, Sprite, Vector2, Vector3 } from 'UnityEngine';
import { Image } from 'UnityEngine.UI';
import { AvatarInteractionObject, Players } from 'ifland.PropEngine';
import { ECompareToken, IFSBehaviour } from 'ifland.ScriptEngine'
import { ChipColor } from './ConnectFour';

export default class ConnectFourNameTagManager extends IFSBehaviour
{
    public iconGold : Sprite;
    public iconSilver : Sprite;
    public iconDice : Sprite
    public nameTagCreatorEffect : GameObject;
    public nameTagWinnerEffect : GameObject;
    public nameTag : GameObject;
    public nameTagBackgroundRectTransform : RectTransform;
    public nameTagAnimator : Animator;
    public capImageMaterial : Material;

    // private nameText : GameObject;
    // private nameTagTMP : TextMeshProUGUI;
    private winnerNameText : GameObject;
    private creatorNameText : GameObject;
    private winnerTMP : TextMeshProUGUI;
    private creatorTMP : TextMeshProUGUI;
    private creatorCapImage : Image;

    private effectPosition : Vector3 = new Vector3(0, 0, -0.1);
    private creatorNameTagPosition : Vector3 = new Vector3(0, 0, 0);
    private creatorBackgroundLocalScale : Vector3 = new Vector3(1.3, 1.3, 1.3);
    private creatorBackgroundLocalPosition : Vector3 = new Vector3(0, 160, -120);
    private winnerNameTagPosition : Vector3 = new Vector3(0, 2, 0);
    private winnerBackgroundLocalScale : Vector3 = new Vector3(5, 5, 5);

    private nameTagCoroutine : Coroutine;
    private aio : AvatarInteractionObject;

    public Init()
    {
        let nametagePrefab = Players.GetMyPlayer().AvatarNameTagPrefab;

        // Prefab API가 없는 경우에 대한 하위 호환성 처리
        if(nametagePrefab == null)
        {
            let allPlayers = Players.GetAllPlayers();
            if(allPlayers.length > 0)
            {
                nametagePrefab = allPlayers[0].NameTagObject;
            }
        }
        
        if(nametagePrefab == null)
        {
            Debug.Log("[ConnectFour] Can't get NameTagObject");
            return;
        }

        this.aio = Players.GetAllPlayers()[0];

        let nameText = nametagePrefab.transform.GetChild(0).GetChild(1).GetChild(0).gameObject;
        
        if($CompareVersion("1.2.16", ECompareToken.Equal) || $CompareVersion("1.2.16", ECompareToken.OrMore))
        {
            this.aio.SetNameTagBillBoard(nametagePrefab, false);
        }
        this.creatorNameText = Object.Instantiate(nameText, this.nameTagBackgroundRectTransform.transform) as GameObject;
        this.creatorNameText.transform.localPosition = new Vector3(32, 2, 0);
        this.creatorNameText.transform.localRotation = Quaternion.Euler(0, 0, 0);
        this.creatorNameText.transform.localScale = Vector3.one;
        this.creatorTMP = this.creatorNameText.GetComponent<TextMeshProUGUI>();

        this.creatorCapImage = this.creatorNameText.transform.GetChild(0).GetComponent<Image>();
        this.creatorCapImage.enabled = true;
        this.creatorCapImage.material = this.capImageMaterial;
        this.creatorCapImage.GetComponent<RectTransform>().sizeDelta = new Vector2(48, 48);


        if($CompareVersion("1.2.16", ECompareToken.Equal) || $CompareVersion("1.2.16", ECompareToken.OrMore))
        {
            this.aio.SetNameTagBillBoard(nametagePrefab, true);
        }
        this.winnerNameText = Object.Instantiate(nameText, this.nameTagBackgroundRectTransform.transform) as GameObject;
        this.winnerNameText.transform.localPosition = new Vector3(32, 2, 0);
        this.winnerNameText.transform.localRotation = Quaternion.Euler(0, 0, 0);
        this.winnerNameText.transform.localScale = Vector3.one;
        this.winnerTMP = this.winnerNameText.GetComponent<TextMeshProUGUI>();

        let capImage = this.winnerNameText.transform.GetChild(0).GetComponent<Image>();
        capImage.enabled = true;
        capImage.material = this.capImageMaterial;
        capImage.GetComponent<RectTransform>().sizeDelta = new Vector2(48, 48);
        capImage.sprite = this.iconDice;

        this.nameTagWinnerEffect.SetActive(false);
        this.winnerNameText.SetActive(false);
        this.creatorNameText.SetActive(false);
    }

    // 칩 생성자 네임태그 노출
    public ShowCreatorNameTag(nickname : string, chipColor : int, isEffectOn : bool = true)
    {
        this.nameTagAnimator.enabled = false;
        this.nameTag.transform.localPosition = this.creatorNameTagPosition;
        if(chipColor == ChipColor.Gold)
        {
            this.creatorCapImage.sprite = this.iconGold;
        }
        else
        {
            this.creatorCapImage.sprite = this.iconSilver;
        }

        this.winnerNameText.SetActive(false);
        this.creatorNameText.SetActive(true);

        this.nameTagCoroutine = this.StartCoroutine(this.SetNickname(this.creatorTMP, nickname, false, isEffectOn, false));
    }

    // 4목 완성자 네임태그 노출
    public ShowWinnerNameTag(nickname : string)
    {
        this.nameTagAnimator.enabled = true;
        this.nameTag.transform.localPosition = this.winnerNameTagPosition;

        this.creatorNameText.SetActive(false);
        this.winnerNameText.SetActive(true);

        this.nameTagCoroutine = this.StartCoroutine(this.SetNickname(this.winnerTMP, nickname, true));
    }

    public HideNameTag()
    {
        this.nameTag.SetActive(false);
        if(this.nameTagCoroutine != null)
        {
            this.StopCoroutine(this.nameTagCoroutine);
            this.nameTagCoroutine = null;
        }
    }

    // 닉네임 설정 코루틴
    private *SetNickname(currentTMP : TextMeshProUGUI, nickname : string, isWinner : bool, isEffectOn : bool = true, isBillBoardOn : bool = true)
    {
        currentTMP.text = nickname;

        yield null;

        this.nameTag.SetActive(true);
        this.transform.localPosition = Vector3.zero;
        this.nameTagBackgroundRectTransform.sizeDelta = new Vector2(currentTMP.preferredWidth + 120, currentTMP.GetComponent<RectTransform>().sizeDelta.y + 35);
        this.nameTagWinnerEffect.SetActive(false);
        this.nameTagCreatorEffect.SetActive(false);

        if(isWinner)
        {
            this.nameTagBackgroundRectTransform.localPosition = Vector3.zero;
            this.nameTagBackgroundRectTransform.localScale = this.winnerBackgroundLocalScale;

            if(isEffectOn)
            {
                this.nameTagWinnerEffect.transform.SetParent(this.nameTagBackgroundRectTransform);
                this.nameTagWinnerEffect.transform.localPosition = this.effectPosition;
                this.nameTagWinnerEffect.transform.localScale = new Vector3(this.nameTagBackgroundRectTransform.sizeDelta.x / 2 + 40, this.nameTagWinnerEffect.transform.localScale.y, this.nameTagWinnerEffect.transform.localScale.z);
                this.nameTagWinnerEffect.SetActive(true);
            }
        }
        else
        {
            this.nameTagBackgroundRectTransform.localPosition = this.creatorBackgroundLocalPosition;
            this.nameTagBackgroundRectTransform.localScale = this.creatorBackgroundLocalScale;

            if(isEffectOn)
            {
                this.nameTagCreatorEffect.transform.SetParent(this.nameTagBackgroundRectTransform);
                this.nameTagCreatorEffect.transform.localPosition = this.effectPosition;
                this.nameTagCreatorEffect.transform.localScale = new Vector3(this.nameTagBackgroundRectTransform.sizeDelta.x + 40, this.nameTagCreatorEffect.transform.localScale.y, this.nameTagCreatorEffect.transform.localScale.z);
                this.nameTagCreatorEffect.SetActive(true);
            }
        }

        this.nameTag.transform.localEulerAngles = Vector3.zero;
        while(isBillBoardOn)
        {
            this.nameTag.transform.rotation = Camera.main.transform.rotation;
            yield null;
        }
    }
};