import { AvatarInteractionObject, iflandButton, PropDescriptor, UserInput, Vehicle } from 'ifland.PropEngine';
import { Animator, Quaternion, RuntimeAnimatorController, Vector3 } from 'UnityEngine';
import { IFSBehaviour } from 'ifland.ScriptEngine'
import VehicleTemplate, { EVehicleState } from './VehicleTemplate';
import VehicleBaseTemplate from './VehicleBaseTemplate';

@RequireComponent<Vehicle>()
@RequireComponent<iflandButton>()
export default class VehicleSubTemplate extends VehicleBaseTemplate
{
    private _vehicleTemplate: VehicleTemplate;
    private _ownerAvatar: AvatarInteractionObject = undefined;
    private _ifsBtn: iflandButton = undefined;
    private _vehicle: Vehicle = undefined;
    private _getOnPivPost: Vector3 = undefined;

    private state: EVehicleState = EVehicleState.Idle;

    //#region Animator Setting
    @Header("Animator")
    public AvatarVehicleRuntimeAnimator: RuntimeAnimatorController;
    private _originRuntimeAnimator: RuntimeAnimatorController = undefined;
    private _avatarAnimator: Animator = undefined;
    //#endregion

    Awake() {
        this._vehicle = this.GetComponent<Vehicle>();
        if (this._vehicle == undefined) {
            console.error("Vehicle Component is undefined!");
            return;
        }

        this._ifsBtn = this.GetComponent<iflandButton>();
        if (this._vehicle.automationButton == undefined) {
            this._vehicle.automationButton = this._ifsBtn;
        }

        this._ifsBtn.OnClick.AddListener(this.OnClick);
        this._vehicle.OnGetOn.AddListener(this.OnMountVehicle);
        this._vehicle.OnGetOff.AddListener(this.OnDismountVehicle);
        this._getOnPivPost = this._vehicle.GetOnPivot.localPosition;
    }

    Update() {
         if (this._ownerAvatar == undefined || this._ownerAvatar.IsNull == true) {
            return;
         }

        var avatarTransform = this._ownerAvatar.transform;
        avatarTransform.localPosition = Vector3.zero;
        avatarTransform.localRotation = Quaternion.identity;
    }

    OnInit(vehicleTemplate: VehicleTemplate) {
        this._vehicleTemplate = vehicleTemplate;
    }

    OnStateUpdate(state: EVehicleState) {
        this.state = state;
        if (this._ownerAvatar != undefined) {
            this.OnAnimatorUpdate();
        }
    }

    public override GetOwnerAvatar(): AvatarInteractionObject {
        return this._ownerAvatar
    }

    GetVehicle(): Vehicle {
        return this._vehicle;
    }

    private OnClick(avatar: AvatarInteractionObject) {
        console.log("[OnClick] - " + avatar.GetUserIdx());
        this._vehicle.GetOn(avatar);
    }

    public override OnMountVehicle(avatar: AvatarInteractionObject) {
        // 1.   탑승과 해제 이벤트가 순서대로 들어온다는 보장이 없어서 예외처리
        // 1-1. 이미 탑승처리 된 아바타가 있는 경우 검출
        if (this._ownerAvatar != undefined) {
            if (this._ownerAvatar != avatar) {
                this.OnDismountVehicle(this._ownerAvatar);
            } else {
                return;
            }
        }

        this._vehicleTemplate.CheckMountInfo(avatar);

        console.log("[OnMountVehicle] - Sub UserIdx: " + avatar.GetUserIdx());
        this._ownerAvatar = avatar;
        if (this._ownerAvatar.IsMine) {
            UserInput.RequestJoystickInput(this);
            UserInput.RequestJumpInput(this);
            UserInput.RequestJoystickButtonHide(this);
            UserInput.RequestJumpButtonHide(this);
            UserInput.RequestEmotionUIHide(this);
        }

        var heightRaito = this._ownerAvatar .HeightRatio;
        var avatarForm = this._getOnPivPost.y + (1 - heightRaito);
        this._vehicle.GetOnPivot.localPosition = new Vector3(this._getOnPivPost.x, avatarForm, this._getOnPivPost.z);

        if (this.AvatarVehicleRuntimeAnimator != undefined) {
            this._avatarAnimator = this._ownerAvatar.GetComponentInChildren<Animator>();
            this._originRuntimeAnimator = this._avatarAnimator.runtimeAnimatorController;
            this._ownerAvatar.SwitchAnimator(this.AvatarVehicleRuntimeAnimator);
        }

        this._vehicleTemplate.UpdatePassengerCount(avatar, true, false, this);
    }

    public override OnDismountVehicle(avatar: AvatarInteractionObject) {
        if (this._ownerAvatar == undefined) return;
        if (this._ownerAvatar != avatar) return;

        console.log("[OnDismountVehicle] - Sub UserIdx: " + avatar.GetUserIdx());

        if (this._originRuntimeAnimator != undefined) {
            this._ownerAvatar.SwitchAnimator(this._originRuntimeAnimator);
        }

        // UserInput 해제 처리
        if (this._ownerAvatar.IsMine) {
            UserInput.RequestEmotionUIShow(this);
            UserInput.RequestJoystickButtonShow(this);
            UserInput.RequestJumpButtonShow(this);
            UserInput.ReleaseJoystickInput(this);
            UserInput.ReleaseJumpInput(this);
        }

        this._vehicle.GetOnPivot.localPosition = this._getOnPivPost;

        this._originRuntimeAnimator = undefined;
        this._avatarAnimator = undefined;
        this._ownerAvatar = undefined;

        this._vehicleTemplate.UpdatePassengerCount(avatar, false, false, this);
    }

    private OnAnimatorUpdate() {
        switch (this.state) {
            case EVehicleState.Idle:
                if (this._avatarAnimator != undefined) {
                    this._avatarAnimator.SetBool("IsWalking", false);
                    this._avatarAnimator.SetBool("IsJumping", false);
                }
                break;

            case EVehicleState.Move:
                if (this._avatarAnimator != undefined) {
                    this._avatarAnimator.SetBool("IsWalking", true);
                    this._avatarAnimator.SetBool("IsJumping", false);
                }
                break;

            case EVehicleState.JumpIdle:
                if (this._avatarAnimator != undefined) {
                    this._avatarAnimator.SetBool("IsWalking", false);
                    this._avatarAnimator.SetBool("IsJumping", true);
                }
                break;

            case EVehicleState.JumpMove:
                if (this._avatarAnimator != undefined) {
                    this._avatarAnimator.SetBool("IsWalking", true);
                    this._avatarAnimator.SetBool("IsJumping", true);
                }
                break
        }
    }
};