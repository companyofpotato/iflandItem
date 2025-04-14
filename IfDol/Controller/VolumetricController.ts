import { Texture } from 'UnityEngine';
import VolumetricObject from '../View/VolumetricObject'
import { IFSBehaviour } from 'ifland.ScriptEngine'

enum Volumetric
{
    Main = 0
}

export default class VolumetricController extends IFSBehaviour
{
    public volumetricObjectList : VolumetricObject[];

    public Initialize(stageCount : int, endingCount : int)
    {
        const length = this.volumetricObjectList.length;
        for(let i = 0;i < length;i++)
        {
            this.volumetricObjectList[i].Initialize(stageCount, endingCount);
        }
    }

    public SetVolumetricTexture(stage : int, texture : Texture)
    {
        this.volumetricObjectList[Volumetric.Main].SetTexture(stage, texture);
    }

    public ChangeMainVolumetric(stage : int)
    {
        this.volumetricObjectList[Volumetric.Main].ChangeVolumetric(stage);
    }

    public GetVolumetricColliderSize() : float
    {
        return this.volumetricObjectList[Volumetric.Main].GetVolumetricColliderSize();
    }
};