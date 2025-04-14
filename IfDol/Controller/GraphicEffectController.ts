import { GameObject } from 'UnityEngine';
import EffectData from '../Model/EffectData';
import { IFSBehaviour } from 'ifland.ScriptEngine'
import InteractionEffectData from '../Model/InteractionEffectData';

export default class GraphicEffectController extends IFSBehaviour
{
    public modelingsObject : GameObject;
    public interactionEffectData : InteractionEffectData;

    private effectDataList : EffectData[];
    private currentEffectIdx : int;

    public Initialize()
    {
        this.effectDataList = this.modelingsObject.GetComponentsInChildren<EffectData>();
        this.currentEffectIdx = 0;

        for(let idx = 0;idx < this.effectDataList.length;idx++)
        {
            this.effectDataList[idx].Initialize();
        }

        this.interactionEffectData.Initialize();
    }

    public GetInteracdtionGraphicTime(stage : int) : float
    {
        return this.interactionEffectData.GetEffectSecond();
    }

    public GetContentGraphicTime(stage : int) : float
    {
        return this.effectDataList[stage].GetEffectSecond();
    }

    public GetAnimationTime(stage : int) : float
    {
        return this.effectDataList[stage].GetAnimationSecond();
    }

    public PlayInteractionGraphic(stage : int)
    {
        this.interactionEffectData.StopEffect();
        this.interactionEffectData.PlayEffect();
    }

    public PlayContentGraphic(stage : int)
    {
        this.effectDataList[this.currentEffectIdx].StopEffect();
        this.effectDataList[this.currentEffectIdx].StopAnimation();
        this.effectDataList[stage].PlayEffect();
        this.effectDataList[stage].PlayAnimation();
        this.currentEffectIdx = stage;
    }
};