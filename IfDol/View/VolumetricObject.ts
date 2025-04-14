import { IFSBehaviour } from 'ifland.ScriptEngine'
import { BoxCollider, Debug, GameObject, Material, MeshRenderer, Texture, Transform } from 'UnityEngine'

export default class VolumetricObject extends IFSBehaviour
{
    public modelingObject : GameObject;
    public endingObject : GameObject;
    public decorateCollider : BoxCollider;

    private volumetricTransformList : Transform[];
    private meshMaterialLiat : Material[];
    private meshRendererList : MeshRenderer[];
    private colliderList : BoxCollider[];

    private currentIdx : int;

    public Initialize(stageCount : int, endingCount : int)
    {
        this.volumetricTransformList = new Array<Transform>(stageCount);
        this.meshRendererList = new Array<MeshRenderer>(stageCount);
        this.meshMaterialLiat = new Array<Material>(stageCount);
        this.colliderList = new Array<BoxCollider>(stageCount);

        let normalCount = stageCount - endingCount;
        let tmpTransform : Transform;

        for(let idx = 0;idx < normalCount ;idx++)
        {
            tmpTransform = this.modelingObject.transform.GetChild(idx);
            this.volumetricTransformList[idx] = tmpTransform;

            this.meshRendererList[idx] = tmpTransform.GetComponentInChildren<MeshRenderer>();
            this.meshMaterialLiat[idx] = this.meshRendererList[idx].material;
            this.colliderList[idx] = tmpTransform.GetComponentInChildren<BoxCollider>();

            // this.meshRendererList[idx].enabled = false;
            // this.colliderList[idx].enabled = false;
        }

        for(let idx = 0;idx < endingCount ;idx++)
        {
            tmpTransform = this.endingObject.transform.GetChild(idx);
            this.volumetricTransformList[idx + normalCount] = tmpTransform;

            this.meshRendererList[idx + normalCount] = tmpTransform.GetComponentInChildren<MeshRenderer>();
            this.meshMaterialLiat[idx + normalCount] = this.meshRendererList[idx + normalCount].material;
            this.colliderList[idx + normalCount] = tmpTransform.GetComponentInChildren<BoxCollider>();

            // this.meshRendererList[idx + normalCount].enabled = false;
            // this.colliderList[idx + normalCount].enabled = false;
        }

        // this.meshRendererList[0].enabled = true;
        // this.colliderList[0].enabled = true;
    
        this.currentIdx = 0;
        this.decorateCollider.center = this.colliderList[0].center;
        this.decorateCollider.size = this.colliderList[0].size;
    }

    public SetTexture(idx : int, texture : Texture)
    {
        this.meshMaterialLiat[idx].SetTexture("_EmissiveTexture", texture);
    }

    public ChangeVolumetric(idx : int)
    {
        if(this.currentIdx == idx)
        {
            return;
        }
        
        if(this.currentIdx >= 0)
        {
            // this.meshRendererList[this.currentIdx].enabled = false;
            // this.colliderList[this.currentIdx].enabled = false;
            this.volumetricTransformList[this.currentIdx].gameObject.SetActive(false);
        }

        // this.meshRendererList[idx].enabled = true;
        // this.colliderList[idx].enabled = true;
        this.decorateCollider.center = this.colliderList[idx].center;
        this.decorateCollider.size = this.colliderList[idx].size;

        this.volumetricTransformList[idx].gameObject.SetActive(true);
        this.currentIdx = idx;
    }

    public GetVolumetricColliderSize() : float
    {
        return this.colliderList[this.currentIdx].size.y * 0.5 + this.colliderList[this.currentIdx].center.y;
    }
};