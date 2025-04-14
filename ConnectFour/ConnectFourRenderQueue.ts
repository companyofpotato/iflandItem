import { IFSBehaviour } from 'ifland.ScriptEngine'
import { Material } from 'UnityEngine'

export default class ConnectFourRenderQueue extends IFSBehaviour
{
    public boardMaterial : Material;
    public boardMaterial2 : Material;
    public standMaterial : Material;
    public standMaterial2 : Material;
    public coneMaterial : Material;

    public boardRenderQueueValue : int = 3100;
    public standRenderQueueValue : int = 3055;

    public touchGuideBackgroundMaterial : Material;
    public touchGuideClickMaterial : Material;
    public nameTagBackgroundMaterial : Material;
    public capImageMaterial : Material;
    public nameTagBGRenderQueueValue : int = 3100;

    public particleMaterial : Material[];
    public particleRenderQueueValue : int = 3100;

    public SetRenderQueue()
    {
        this.boardMaterial.renderQueue = this.boardRenderQueueValue;
        this.boardMaterial2.renderQueue = this.standRenderQueueValue;
        this.standMaterial.renderQueue = this.standRenderQueueValue;
        this.standMaterial2.renderQueue = this.standRenderQueueValue;
        this.coneMaterial.renderQueue = this.particleRenderQueueValue;

        this.nameTagBackgroundMaterial.renderQueue = this.nameTagBGRenderQueueValue;
        this.capImageMaterial.renderQueue = this.nameTagBGRenderQueueValue;
        this.touchGuideBackgroundMaterial.renderQueue = this.nameTagBGRenderQueueValue;
        this.touchGuideClickMaterial.renderQueue = this.nameTagBGRenderQueueValue;

        this.particleMaterial.forEach(element =>
        {
           element.renderQueue = this.particleRenderQueueValue; 
        });
    }
};