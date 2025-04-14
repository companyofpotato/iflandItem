import { GameObject, Object, Debug, Transform, Material, Sprite } from 'UnityEngine'
import { Image } from 'UnityEngine.UI'
import { Players } from 'ifland.PropEngine'
import { IFSBehaviour } from 'ifland.ScriptEngine'

export default class DinoRouletteNameTagCreater extends IFSBehaviour
{
    dinoIconImage : Sprite

    private nameTagObject : GameObject
    private nameTagTransform : Transform
    @SerializeField()
    private backgroundMaterial : Material

    RouletteLog(str : string)
    {
        Debug.Log(" PIID : " + this.PropInstaceID + " [DinoRoulette] " + str)
    }

    RouletteErrorLog(str : string)
    {
        Debug.LogError(" PIID : " + this.PropInstaceID + " [DinoRoulette] " + str)
    }

    Init()
    {
        var originalNameTagObject = Players.GetMyPlayer().AvatarNameTagPrefab;

        // Prefab API가 없는 경우에 대한 하위 호환성 처리
        if(originalNameTagObject == null)
        {
            this.RouletteLog("Find Host's NameTag");
            var allPlayers = Players.GetAllPlayers();
            allPlayers = allPlayers.filter(element => element.IsMaster == true);
            originalNameTagObject = allPlayers[0].NameTagObject;
        }
        
        if(originalNameTagObject == null)
        {
            this.RouletteErrorLog("No originalNameTagObject");
            return;
        }

        this.backgroundMaterial = originalNameTagObject.transform.GetChild(0).GetChild(1).GetComponent<Image>().material
        originalNameTagObject = originalNameTagObject.transform.GetChild(0).GetChild(1).GetChild(0).gameObject
        this.nameTagObject = Object.Instantiate(originalNameTagObject, this.transform) as GameObject
        if(this.nameTagObject != null)
        {
            this.nameTagTransform = this.nameTagObject.transform;

            this.nameTagTransform.GetChild(1).gameObject.SetActive(false);
            var capImage = this.nameTagTransform.GetChild(0).GetComponent<Image>();
            capImage.sprite = this.dinoIconImage;

            this.nameTagObject.SetActive(false)
            this.RouletteLog("NameTagObject Set");
        }
        else
        {
            this.RouletteErrorLog("No nameTagObject")
        }
    }

    GetNameTagObject() : GameObject
    {
        return this.nameTagObject
    }

    GetBackgroundMaterial() : Material
    {
        return this.backgroundMaterial
    }
};