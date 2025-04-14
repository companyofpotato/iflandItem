import { IFSBehaviour } from 'ifland.ScriptEngine'
import { Coroutine, GameObject, Material, WaitForSeconds } from 'UnityEngine';

export default class GraphicObject extends IFSBehaviour
{
    public exposeSecond : float = 1.0;
    public particleObjects : GameObject[];
    public particleMaterialList : Material[];

    private effectCoroutine : Coroutine;
    private currentEffectIdx : int = -1;
    private waitForSeconds : WaitForSeconds;

    public Initialize(renderQueueValue : int)
    {
        this.waitForSeconds = new WaitForSeconds(this.exposeSecond);
        this.currentEffectIdx = -1;

        const length = this.particleMaterialList.length;
        for(let i = 0;i < length;i++)
        {
            this.particleMaterialList[i].renderQueue = renderQueueValue;
        }
    }

    public PlayEffect(idx : int)
    {
        if(this.currentEffectIdx >= 0)
        {
            this.StopCoroutine(this.effectCoroutine);
            this.particleObjects[this.currentEffectIdx].SetActive(false);
        }

        this.effectCoroutine = this.StartCoroutine(this.EffectPlayingCoroutine(idx));
    }

    private *EffectPlayingCoroutine(idx : int)
    {
        this.currentEffectIdx = idx;
        this.particleObjects[this.currentEffectIdx].SetActive(false);
        this.particleObjects[this.currentEffectIdx].SetActive(true);
        yield this.waitForSeconds;
        this.particleObjects[this.currentEffectIdx].SetActive(false);
        this.currentEffectIdx = -1;
    }
};