import { IFSBehaviour } from 'ifland.ScriptEngine'
import { Collider, CollisionDetectionMode, LayerMask, Rigidbody, RigidbodyConstraints } from 'UnityEngine';
import { IFSEvent } from './IFSEventHandler';

export default class VehicleTriggerController extends IFSBehaviour
{
    private triggerCollider: Collider
    private rigidbody: Rigidbody;

    triggerEventHandler: IFSEvent = new IFSEvent();

    Awake()
    {
        this.triggerCollider = this.GetComponent<Collider>();
        this.rigidbody = this.GetComponent<Rigidbody>();
        
        this.triggerCollider.isTrigger = true;
        this.rigidbody.isKinematic = false;
        this.rigidbody.collisionDetectionMode = CollisionDetectionMode.ContinuousSpeculative;
        this.rigidbody.constraints = RigidbodyConstraints.FreezeAll;
    }

    private OnTriggerStay(other: Collider)
    {
        if(other.transform.root == this.transform.root) return;
        //if(this._ownerAvatar == undefined) return;

        if(LayerMask.LayerToName(other.gameObject.layer) == "MyAvatar") return;
        if(LayerMask.LayerToName(other.gameObject.layer) == "OtherAvatar") return;
        if(LayerMask.LayerToName(other.gameObject.layer) == "AudioAvatar") return;
        if(LayerMask.LayerToName(other.gameObject.layer) == "Ground") return;

        this.triggerEventHandler?.Invoke();
    }
};