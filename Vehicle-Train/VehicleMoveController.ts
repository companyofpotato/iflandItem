import { AvatarInteractionObject, CameraControl } from 'ifland.PropEngine'
import { BoxCollider, Camera, Collider, Color, Debug, GameObject, Input, LayerMask, Mathf, Mesh, MeshCollider, Physics, Ray, RaycastHit, Rigidbody, Transform, Vector2, Vector3 } from 'UnityEngine';
import VehicleTemplate, { EVehicleState } from './VehicleTemplate';
import { IFSBehaviour } from 'ifland.ScriptEngine';
import { IFSRaycastHit } from 'ifland.ScriptEngine.ExtensionModule';
import VehicleTriggerController from './VehicleTriggerController';

enum EJumpState {
    JumpUp = 1,
    JumpDown = 2,
    Fly = 3
}

//@RequireComponent<Rigidbody>()
export default class VehicleMoveController extends IFSBehaviour
{
    private _rigidbody: Rigidbody = undefined;
    private _mainCameraTransform: Transform = undefined;
    private _ownerAvatar: AvatarInteractionObject = undefined;

    //#region Input Setting Properties
    @Header("Input Setting")
    @SerializeField()
    private useJumpByFly: bool;
    private jumpState: EJumpState = EJumpState.JumpDown;
    //#endregion

    @Space(10)
    @Header("Trigger Controller Setting")

    @SerializeField()
    private forwardTrigger: VehicleTriggerController;

    @SerializeField()
    private upTrigger: VehicleTriggerController;

    @SerializeField()
    private triggerParent: GameObject;

    //#region Move Setting Properties
    @Space(10)
    @Header("Move Setting")
    @SerializeField()
    private moveSpeed: float = 1;
    @SerializeField()
    private moveAcceleration: float = 0.05;
    @SerializeField()
    private moveDeceleration: float = 0.05;

    @Space(10)
    @Header("Rotate Setting")
    @SerializeField()
    private rotateSpeed: float = 1;

    @Space(10)
    @Header("Jump & Fly Setting")
    @SerializeField()
    private jumpPower: float = 1;
    @SerializeField()
    private flyMaxHeight: float = 2;
    @SerializeField()
    private flyIdleHeight: float = 1.8;
    @SerializeField()
    private flyIdlePower: float = 1;
    private _verticalVelocity: float = 0;

    @SerializeField()
    private gravityPower: float = -1;
    private _isGrounded: bool = false;
    private _jumpStartY: float = 0;

    private _roateThreshold: float = 0.02;
    private _defaultRotateSpeed: float = 100;
    private _defaultMoveSpeed: float = 5;

    private _isJoysticInput: bool = false;
    private _isJumpInput: bool = false;
    private _accelerationValue: float = 0;
    private _moveXZDir: Vector3 = Vector3.zero;
    private _moveVelocity: Vector3 = Vector3.zero;
    private _lastMoveVelocity: Vector3 = Vector3.zero;

    private layermask: int;

    //#endregion

    private Awake() {
        this.triggerParent.SetActive(false);
        this.forwardTrigger.gameObject.SetActive(true);
        this.upTrigger.gameObject.SetActive(false);

        this.layermask = ((1 << LayerMask.NameToLayer("MyAvatar")) | (1 << LayerMask.NameToLayer("OtherAvatar")) | (1 << LayerMask.NameToLayer("AudioAvatar"))| (1 << LayerMask.NameToLayer("Ground")));
        this.layermask = ~this.layermask;

        this._mainCameraTransform = CameraControl.CameraTransform;
        var mainTemplate = this.GetComponent<VehicleTemplate>();
        if(mainTemplate == undefined)
        {
            console.error("VehicleTemplate is null");
            return;
        }

        // mainTemplate AddEventListener
        mainTemplate.MountEventHandler.AddEventListener("VehicleMoveController", this.OnMountVehicle);
        mainTemplate.DismountEventHandler.AddEventListener("VehicleMoveController", this.OnDismountVehicle);
        mainTemplate.FixedUpdateEventHandler.AddEventListener("VehicleMoveController",this.OnFixedUpdate);
        mainTemplate.JoystickUpdateEventHandler.AddEventListener("VehicleMoveController", this.OnEventJoystickUpdate);
        mainTemplate.JoystickStopEventHandler.AddEventListener("VehicleMoveController", this.OnEventJoystickStop);
        mainTemplate.JumpUpEventHandler.AddEventListener("VehicleMoveController", this.OnEventJumpUp);
        mainTemplate.JumpDownEventHandler.AddEventListener("VehicleMoveController", this.OnEventJumpDown);

        this.forwardTrigger.triggerEventHandler.AddEventListener("VehicleMoveController", this.OnEventForwardTriggerStay);
        this.upTrigger.triggerEventHandler.AddEventListener("VehicleMoveController", this.OnEventUpTriggerStay);
    }

    private _canMoveForward: int = 0; 
    private _canMoveUp: boolean = true;

    public OnFixedUpdate(fixedDeltaTime: float, state: EVehicleState, planDistance: float,  isGrounded: bool) {
        if (this._ownerAvatar == undefined) return;
        if (this._ownerAvatar.IsMine == false) return;
        if (state == EVehicleState.Action) return;

        if (this._isJoysticInput == false) {
            if (this._accelerationValue != 0) {
                this._accelerationValue -= this.moveDeceleration;
                this._accelerationValue = Mathf.Max(this._accelerationValue, 0);
            }
        } else {
            this._accelerationValue += this.moveAcceleration;
            this._accelerationValue = Mathf.Min(this._accelerationValue, 1);
        }

        this._isGrounded = isGrounded;

        this.OnMoveUpdate(fixedDeltaTime);
        this.OnRotateUpdate(fixedDeltaTime);
        this.OnJumpUpdate(fixedDeltaTime, planDistance);

        this._lastMoveVelocity = this._moveVelocity;
        if(this._moveVelocity != Vector3.zero)
        {
            this.transform.Translate(this._moveVelocity, 0);
            this._moveVelocity = Vector3.zero;
        }

        if(this._canMoveForward > 0)
            this._canMoveForward -=1;

        this._canMoveUp = true;
    }

    public OnMountVehicle(avatar: AvatarInteractionObject, passengerCount: int, isOperator: bool) {
        if(isOperator == false) return;

        console.log("[VehicleMoveController] - OnMountVehicle");
        if (avatar.IsMine == false) return;

        // init canMove flag
        this._canMoveForward = 0;
        this._canMoveUp = true;

        this._ownerAvatar = avatar;
        this._moveXZDir = Vector3.zero;

        if(isOperator) this.triggerParent.SetActive(true);
    }

    public OnDismountVehicle(avatar: AvatarInteractionObject, passengerCount: int, isOperator: bool) {
        if(isOperator == false) return;

        console.log("[VehicleMoveController] - OnDismountVehicle");
        if (avatar.IsMine == false) return; 
        
        this._ownerAvatar = undefined;
        this._isJumpInput = false;
        this._isJoysticInput = false;
        this._verticalVelocity = 0;
        this._moveVelocity = Vector3.zero;
        this._moveXZDir = Vector3.zero;
        this.jumpState = EJumpState.JumpDown;
        if(isOperator) this.triggerParent.SetActive(false);
    }

    //#region Move Update
    private OnJumpUpdate(fixedDeltaTime: float, planDistance: float) {
        var gravity = this.gravityPower * fixedDeltaTime;
        switch (this.jumpState) {
            case EJumpState.Fly:
                if (this.useJumpByFly == false || this._isJumpInput == false || !this._canMoveUp) {
                    this.jumpState = EJumpState.JumpDown;
                    this._verticalVelocity = 0;
                    break;
                }

                var flyDistance: float = this.transform.position.y - this._jumpStartY;
                var flyVelocity = flyDistance >= this.flyIdleHeight ? -this.flyIdlePower : this.flyIdlePower;

                this._verticalVelocity += flyVelocity * fixedDeltaTime;
                this._moveVelocity.y = this._verticalVelocity * fixedDeltaTime;
                break;

            case EJumpState.JumpUp:
                if (this.useJumpByFly) {
                    if (this._isJumpInput == false || !this._canMoveUp) {
                        this.jumpState = EJumpState.JumpDown;
                        this._verticalVelocity = 0;
                        break;
                    }

                    this._moveVelocity.y = this._verticalVelocity * fixedDeltaTime;

                    // this._jumpStartY: 날기 시작한 위치 기준
                    var flyDistance: float = this.transform.position.y - this._jumpStartY;
                    if (flyDistance + this._moveVelocity.y >= this.flyMaxHeight || !this._canMoveUp) {
                        this.jumpState = EJumpState.Fly;
                        this._verticalVelocity = 0;
                    }

                } else {
                    this._verticalVelocity += gravity;
                    this._moveVelocity.y = this._verticalVelocity * fixedDeltaTime;

                    if (this._moveVelocity.y <= 0) {
                        this.jumpState = EJumpState.JumpDown;
                    }
                }
                break;

            case EJumpState.JumpDown:
                if (this._isGrounded) {
                    this._verticalVelocity = 0;
                    break;
                }

                this._verticalVelocity += gravity;
                this._moveVelocity.y = this._verticalVelocity * fixedDeltaTime;
                this._moveVelocity.y = Mathf.Max(planDistance, this._moveVelocity.y);
                break;
        }
    }

    private OnMoveUpdate(fixedDeltaTime: float) {
        if (this._accelerationValue <= 0) return;

        var length = this._moveXZDir.magnitude;

        var moveSpeed = this._defaultMoveSpeed * this.moveSpeed * this._accelerationValue;

        var dest = this.transform.forward * length * moveSpeed * fixedDeltaTime;


        this._moveVelocity = new Vector3(dest.x, 0, dest.z);


        if (this._canMoveForward > 0 && length > 0) {
            this._moveVelocity.x = 0;
            this._moveVelocity.z = 0;
        }
    }

    private OnRotateUpdate(fixedDeltaTime: float) {
        if (this._isJoysticInput == false) return;

        var crossVec = Vector3.Cross(this._moveXZDir, this.transform.forward);
        var dot = Vector3.Dot(crossVec, Vector3.up);
        var rotateSpeed = this._defaultRotateSpeed * this.rotateSpeed;
        var angle = Vector3.Angle(this._moveXZDir, this.transform.forward);
        var value = Mathf.Min(rotateSpeed * fixedDeltaTime, angle);
        
       if (dot > this._roateThreshold) { // Left
           this.transform.Rotate(0, -value, 0);
       } 
       else if (dot < -this._roateThreshold) {  // Right
           this.transform.Rotate(0, value, 0);
       } 
       else {
           // TODO: 최적화
           var crossVec_r = Vector3.Cross(this._moveXZDir, this.transform.right);
           var dot_r = Vector3.Dot(crossVec_r, Vector3.up);
           if (dot_r < -this._roateThreshold) {
               this.transform.Rotate(0, value, 0);
           }
       }
    }
    //#endregion

    //#region User Input Noty
    public OnEventJoystickUpdate(inputVector: Vector2) {
        var lookForward = this._mainCameraTransform.forward;
        var lookRight = this._mainCameraTransform.right;
        var lookUp = this._mainCameraTransform.up;

        lookForward.y = 0;
        lookRight.y = 0;
        lookUp.y = 0;

        var forward = (lookForward.sqrMagnitude > lookUp.sqrMagnitude ? lookForward : lookUp).normalized;
        var right = lookRight.normalized;
        this._moveXZDir = forward * inputVector.y + right * inputVector.x;
        this._isJoysticInput = true;
    }

    public OnEventJoystickStop() {
        this._isJoysticInput = false;
    }

    public OnEventJumpUp() {
        this._isJumpInput = false;
        this.upTrigger.gameObject.SetActive(false);
    }

    public OnEventJumpDown() {
        this._isJumpInput = true;
        this.upTrigger.gameObject.SetActive(true);
        
        if (this.useJumpByFly) {
            if (this._isGrounded) {
                this._jumpStartY = this.transform.position.y;
            }

            this._verticalVelocity = this.jumpPower;
            this.jumpState = EJumpState.JumpUp;
        } else {
            if (this._isGrounded) {
                this._verticalVelocity = this.jumpPower;
                this.jumpState = EJumpState.JumpUp;
            }
        }
    }

    public OnEventForwardTriggerStay()
    {
        this._canMoveForward = 5;
    }

    public OnEventUpTriggerStay()
    {
        this._canMoveUp = false;
    }

    //#endregion

    //#region Public Getter
    public GetMoveDir(): Vector3 {
        return this._moveXZDir;
    }

    public GetAccelerationValue(): float{
        return this._accelerationValue;
    }

    public GetLastMoveVelocity() :Vector3 {
        return this._lastMoveVelocity;
    }
    //#endregion
};