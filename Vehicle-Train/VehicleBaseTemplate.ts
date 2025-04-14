import { AvatarInteractionObject } from 'ifland.PropEngine';
import { IFSBehaviour } from 'ifland.ScriptEngine'

export default class VehicleBaseTemplate extends IFSBehaviour
{
    public OnMountVehicle(avatar: AvatarInteractionObject)
    {

    }

    public OnDismountVehicle(avatar: AvatarInteractionObject)
    {

    }

    public GetOwnerAvatar(): AvatarInteractionObject {
        return undefined;
    }
};