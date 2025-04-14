import { IFSBehaviour } from 'ifland.ScriptEngine'
import { Quaternion, Transform, Vector3 } from 'UnityEngine'

export default class CameraModeData extends IFSBehaviour
{
    private originOffset : Vector3;
    private originZoomDistance : int;
    private originRotation : Quaternion;

    public editModeZoomDistance : float;
    public editModeSpot : Transform;

    public SetOriginOffset(value : Vector3)
    {
        this.originOffset = value;
    }

    public SetOriginZoomDistance(value : int)
    {
        this.originZoomDistance = value;
    }

    public SetOriginRotation(value : Quaternion)
    {
        this.originRotation = value;
    }

    public GetOriginOffset() : Vector3
    {
        return this.originOffset;
    }

    public GetOriginZoomDistance() : int
    {
        return this.originZoomDistance;
    }

    public GetOriginRotation() : Quaternion
    {
        return this.originRotation;
    }

    public GetEditModeZoomDistance() : int
    {
        return this.editModeZoomDistance;
    }

    public GetEditModeSpot() : Transform
    {
        return this.editModeSpot;
    }
};