import { Transform } from 'UnityEngine';
import { AvatarInteractionObject, Vehicle } from 'ifland.PropEngine'
import { IFSBehaviour } from 'ifland.ScriptEngine'


export default class AvatarIKController extends IFSBehaviour
{
    private _vehicle: Vehicle;
    public ikTypeList: int[];
    public targetList: Transform[];

    Start() {
        this._vehicle = this.GetComponent<Vehicle>();
        if(this._vehicle == undefined) return;
        if(this.ikTypeList == undefined) return;
        if(this.targetList == undefined) return;
        
        this._vehicle.OnGetOn.AddListener(this.OnMountVehicle);
        this._vehicle.OnGetOff.AddListener(this.OnDismountVehicle);
    }

    OnMountVehicle(avatar: AvatarInteractionObject) {
        for(var i=0; i< this.ikTypeList.length; i++)
        {
            var ikType = this.ikTypeList[i];
            var target = this.targetList[i];

            if(target == undefined || target.IsNull == true) continue;

            avatar.SetIKEffectorEnable(ikType, true);
            avatar.SetIKRotationEnable(ikType, true);
            avatar.SetIKTarget(ikType, target);
        }
    }

    OnDismountVehicle(avatar: AvatarInteractionObject) {
        for(var i=0; i< this.ikTypeList.length; i++)
        {
            var ikType = this.ikTypeList[i];
            avatar.SetIKEffectorEnable(ikType, false);
            avatar.SetIKRotationEnable(ikType, false);
            avatar.SetIKTarget(ikType, undefined);
        }
    }
};