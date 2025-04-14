import { IFSBehaviour } from 'ifland.ScriptEngine'
import { Players } from 'ifland.PropEngine';
import { Camera, Debug, GameObject, Object, RectTransform, Transform, Vector2, Vector3 } from 'UnityEngine';
import { TextMeshProUGUI } from 'TMPro';

export default class UIObjectOld extends IFSBehaviour
{
    public nameTag : Transform;
    public rectTransform : RectTransform;

    private nameTextOriginal : GameObject;
    private nameText : GameObject;
    private nameTagTMP : TextMeshProUGUI;

    Initialize()
    {
        var originalNameTagObject = Players.GetMyPlayer().AvatarNameTagPrefab;

        // Prefab API가 없는 경우에 대한 하위 호환성 처리
        if(originalNameTagObject == null)
        {
            var allPlayers = Players.GetAllPlayers();
            if(allPlayers.length > 0)
            {
                originalNameTagObject = allPlayers[0].NameTagObject;
            }
        }
        
        if(originalNameTagObject == null)
        {
            Debug.Log("[IFDoll] Can't get NameTagObject");
            return;
        }

        this.nameTextOriginal = originalNameTagObject.transform.GetChild(0).GetChild(1).GetChild(0).gameObject;

        this.nameText = Object.Instantiate(this.nameTextOriginal, this.rectTransform) as GameObject;
        this.nameText.transform.GetChild(0).gameObject.SetActive(false);

        this.nameTagTMP = this.nameText.GetComponent<TextMeshProUGUI>();
    }

    OnEnable()
    {
        this.StartCoroutine(this.BillBoard);
    }

    private *SetTMP(text : string)
    {
        this.nameTagTMP.text = text;

        yield null;

        this.rectTransform.localPosition = Vector3.zero;
        this.rectTransform.sizeDelta = new Vector2(this.nameTagTMP.preferredWidth + 120, this.nameText.GetComponent<RectTransform>().sizeDelta.y + 35);
    }

    private *BillBoard()
    {
        this.nameTag.localEulerAngles = Vector3.zero;
        while(true)
        {
            this.nameTag.rotation = Camera.main.transform.rotation;
            yield null;
        }
    }

    public SetText(data : string)
    {
        this.StartCoroutine(this.SetTMP(data));
    }
};