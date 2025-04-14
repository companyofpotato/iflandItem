import { AvatarInteractionObject } from 'ifland.PropEngine';
import { AudioSource } from 'UnityEngine';
import VehicleTemplate, { EVehicleState } from './VehicleTemplate';
import { IFSBehaviour } from 'ifland.ScriptEngine';

export default class VehicleAudioController extends IFSBehaviour
{
    public JumpAudioPlayer: AudioSource;
    public MoveAudioPlayer: AudioSource;
    private _state: EVehicleState = EVehicleState.Idle;
    private _isMyAvatarGetOn: bool = false;

    private Awake()
    {
        var mainTemplate = this.GetComponent<VehicleTemplate>();
        mainTemplate.MountEventHandler.AddEventListener("VehicleAudioController", this.OnMountVehicle);
        mainTemplate.DismountEventHandler.AddEventListener("VehicleAudioController", this.OnDismountVehicle);
        mainTemplate.FixedUpdateEventHandler.AddEventListener("VehicleAudioController",this.OnFixedUpdate);
    }

    // 아바타 탑승
    public OnMountVehicle(avatar: AvatarInteractionObject, passengerCount: int, isOperator: bool) { 
        if (avatar.IsMine == false) return;

        console.log("[VehicleAudioController] - OnMountVehicle");
        this._isMyAvatarGetOn = true;
    }

    // 아바타 하차
    public OnDismountVehicle(avatar: AvatarInteractionObject, passengerCount: int, isOperator: bool) {
        if (avatar.IsMine == false) return;

        console.log("[VehicleAudioController] - OnDismountVehicle");
        this._isMyAvatarGetOn = false;
        this._state = EVehicleState.Idle;
        if (this.JumpAudioPlayer.isPlaying)
            this.JumpAudioPlayer.Stop();

        if (this.MoveAudioPlayer.isPlaying)
            this.MoveAudioPlayer.Stop();
    }

    public OnFixedUpdate(fixedDeltaTime: float, state: EVehicleState, planDistance: float, isGrounded: bool) {
        if (this._isMyAvatarGetOn == false || this._state == state) {
            return;
        } 

        var isFly = this._state >= 10;
        this._state = state;
        if (this._state == EVehicleState.Move) {
            if (this.MoveAudioPlayer.isPlaying == false) {
                this.MoveAudioPlayer.Play();
            }  
        } else {
            if (this.MoveAudioPlayer.isPlaying) {
                this.MoveAudioPlayer.Stop();
            }

            if (this._state >= 10 && isFly == false) {
                this.JumpAudioPlayer.Play();
            }
        }
    }
}