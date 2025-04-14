import { AvatarInteractionObject, iflandButton, InteractionButtons, Lab, Land, MultiPlay, PropDescriptor, ServerTransformData, ServerTransformHistory, TransformSyncObject, UserInput, UserJoystickInputHandler, UserJumpInputHandler, Vehicle } from 'ifland.PropEngine'
import { Animator, Collider, LayerMask, Mathf, ParticleSystem, Physics, Quaternion, RuntimeAnimatorController, Time, Vector2, Vector3 } from 'UnityEngine';
import { IFSRaycastHit } from 'ifland.ScriptEngine.ExtensionModule';
import VehicleSubTemplate from './VehicleSubTemplate';
import { IFSEvent, IFSEvent$1, IFSEvent$3, IFSEvent$4 } from './IFSEventHandler';
import VehicleBaseTemplate from './VehicleBaseTemplate';

// https://confluence.tde.sktelecom.com/display/TELP/12.+MoveType
// 0 ~ 8 
export enum EVehicleState {
    Idle = 10,
    Move,
    JumpIdle = 20,
    JumpMove,
    Action
}

@RequireComponent<Vehicle>()
@RequireComponent<iflandButton>()
@RequireComponent<TransformSyncObject>()
export default class VehicleTemplate extends VehicleBaseTemplate
{
    private _mountInfo: VehicleBaseTemplate[] = [];

    @Header("Sub Templates")
    public VehicleSubTemplates: VehicleSubTemplate[] = [];
    public IsParking(): bool{
        return this._isParking && this._passengerCount == 0;
    }
    private _isParking: bool = true;
    private _passengerCount: int = 0;
    private _layerMask: LayerMask;

    //#region Event Handler
    public MountEventHandler: IFSEvent$3<AvatarInteractionObject, int, bool> = new IFSEvent$3<AvatarInteractionObject, int, bool>();
    public DismountEventHandler: IFSEvent$3<AvatarInteractionObject, int, bool> = new IFSEvent$3<AvatarInteractionObject, int, bool>();
    public FixedUpdateEventHandler: IFSEvent$4<float, EVehicleState, float, bool> = new IFSEvent$4<float, EVehicleState, float, bool>();
    public JoystickUpdateEventHandler: IFSEvent$1<Vector2> = new IFSEvent$1<Vector2>();
    public JoystickStopEventHandler: IFSEvent = new IFSEvent();
    public JumpUpEventHandler: IFSEvent = new IFSEvent();
    public JumpDownEventHandler: IFSEvent = new IFSEvent();
    public JumpPressEventHandler: IFSEvent = new IFSEvent();
    public JumpClickEventHandler: IFSEvent = new IFSEvent();
    //#endregion

    private _propDescriptor: PropDescriptor = undefined;
    private _ownerAvatar: AvatarInteractionObject = undefined;
    private _ifsBtn: iflandButton = undefined;
    private _vehicle: Vehicle = undefined;
    private _transformSyncObject: TransformSyncObject = undefined;
    private state: EVehicleState = EVehicleState.Idle;
    private _getOnPivPost: Vector3 = undefined;

    //#region Animator Properties
    @Space(10)
    @Header("Animator")
    public VehicleAnimator: Animator;
    public AvatarVehicleRuntimeAnimator: RuntimeAnimatorController;
    private _originRuntimeAnimator: RuntimeAnimatorController = undefined;
    private _avatarAnimator: Animator = undefined;
    //#endregion

    //#region 
    @Space(10)
    @Header("AvatarPose")
    public UseAvatarHeightRaito: bool = true;
    //#endregion

    //#region UserInput Properties
    @Space(10)
    @Header("UserInput")
    public UseJumpBtn: bool
    private _isMoved: bool = false;
    private _isJumped: bool = false;
    private _forceSync: bool = false;
    private _joystickInput: UserJoystickInputHandler = undefined;
    private _jumpInput: UserJumpInputHandler = undefined;
    //#endregion

    //#region GroundCheck
    @Space(10)
    @Header("GroundCheck")
    public GroundCheckHeight: float = 0.5;
    public GroundCheckOffset: float = 0.5;
    public HitCollider: Collider;
    //#endregion

    //#region Transform Sync Properties
    @Space(10)
    @Header("Synchronization")
    public Synchronization: bool = true;

    private lastSyncPose: Vector3 = undefined;
    private syncHistories: ServerTransformHistory[] = [];
    private syncReceiveTimeHistories: int[] = [];

    private _currentHistory: ServerTransformHistory = undefined;
    private _complateHistory: ServerTransformHistory = undefined;
    private _currentReceiveTime: int = undefined;
    private _complateReceiveTime: int = undefined;

    private _lastReceiveHistory: ServerTransformHistory = undefined;
    private _lastReceiveTime: int = undefined;

    private _currWaitSyncTime: float = 0;
    private _estimatedSpeed: float = 0;
    private _copy_estimatedSpeed: float = 0;
    private _estimatedRotSpeed: float = 0;
    private _estimatedScaleSpeed: float = 0;

    private SERVER_SYNC_TIMEP_TERM: float = 0.25;
    private MAX_SYNC_COUNT: int = 3;
    private MAX_DISTANCE_SQR: float = 9;
    private MOVE_THRESHOLD_SQR: float = 0.001;
    private GROUND_THRESHOLD: float = 0.05;
    //#endregion

    //#region  Teleport VFX
    @Space(10)
    @Header("Teleport VFX")
    public TeleportVFX_From: ParticleSystem;
    public TeleportVFX_To: ParticleSystem;
    //#endregion

    //#region Falling Properties
    private _isGrounded: bool = false;
    private _planDistance: float = 0;
    private _fallingVelocity: float = 0;
    //#endregion

    //#region Unity Message Lifecycle
    Awake() {
        this._vehicle = this.GetComponent<Vehicle>();
        if (this._vehicle == undefined) {
            console.error("Vehicle Component is undefined!");
            return;
        }

        this._propDescriptor = this.transform.root.GetComponent<PropDescriptor>();
        this._transformSyncObject = this.GetComponent<TransformSyncObject>();

        if (this._transformSyncObject != undefined) {
            this._transformSyncObject.IsReceiveSync = false;
            this._transformSyncObject.IsMyObjectSync = false;
            this._transformSyncObject.Synchronization = TransformSyncObject.SyncType.Manual;
            this._transformSyncObject.OnSyncTransform += this.OnSyncTransform;
        } 

        this._ifsBtn = this.GetComponent<iflandButton>();
        if (this._vehicle.automationButton == undefined) {
            this._vehicle.automationButton = this._ifsBtn;
        }

        this._ifsBtn.OnClick.AddListener(this.OnClick);
        this._vehicle.OnGetOn.AddListener(this.OnMountVehicle);
        this._vehicle.OnGetOff.AddListener(this.OnDismountVehicle);
        this._getOnPivPost = this._vehicle.GetOnPivot.localPosition;

        this._joystickInput = new UserJoystickInputHandler();
        this._joystickInput.OnUpdate = this.OnEventJoystickUpdate;
        this._joystickInput.OnStop = this.OnEventJoystickStop;

        this._jumpInput = new UserJumpInputHandler();
        this._jumpInput.OnDown = this.OnEventJumpDown;
        this._jumpInput.OnUp = this.OnEventJumpUp;
        this._jumpInput.OnPress = this.OnEventJumpPress;
        this._jumpInput.OnClick = this.OnEventJumpClick;

        // Sub Template에 UpdataCallback 등록
        this.VehicleSubTemplates.forEach(sub => {
            sub.OnInit(this);
        })

        var ignoreLayer = (1 << 1) | (1 << 2) | (1 << 3) | (1 << 5) | (1 << 6);
        this._layerMask = new LayerMask();
        this._layerMask.value = ~ignoreLayer;
    }

    FixedUpdate() {
        var fixedDeltaTime = Time.fixedDeltaTime;

        // 탈 것이 지상에 있는지를 검출
        this.OnGroundCheckUpdate();

        // 운전자가 없는 상황에서의 움직임
        if (this._ownerAvatar == null || this._ownerAvatar.IsNull == true) {
            this.state = EVehicleState.Idle;

            if (this._isGrounded) {
                this._fallingVelocity = 0;
            } else {
                this._fallingVelocity += (fixedDeltaTime * -1);
                var falling = Mathf.Max(this._planDistance, this._fallingVelocity);
                this.transform.Translate(new Vector3(0, falling, 0));
            }
            return;
        }

        // 아바타 위치 보정
        var avatarTransform = this._ownerAvatar.transform;
        avatarTransform.localPosition = Vector3.zero;
        avatarTransform.localRotation = Quaternion.identity;

        if (this._ownerAvatar.IsMine) {
            // 탈 것에 상태를 업데이트
            // 상태가 변경된 경우 강제로 Sync
            this._forceSync = this.OnStateUpdate();
        }

        // 탈 것의 애니메이터를 업데이트
        this.OnAnimatorUpdate();

        // Update Tick
        this.FixedUpdateEventHandler.Invoke(fixedDeltaTime, this.state, this._planDistance, this._isGrounded);

        // Sub Template에게 현재 Vehicle 상태 업데이트
        this.VehicleSubTemplates.forEach(sub => {
            sub.OnStateUpdate(this.state);
        })

        // Trasnform Sync
        if (this.Synchronization) {
            this.UpdateSyncTransform(fixedDeltaTime);
        }
    }

    UpdateSyncTransform(fixedDeltaTime: float) {
        if (this._ownerAvatar.IsMine == false) {
            //this._copy_estimatedSpeed = 0;
            this.VehicleReceiveUpdate(fixedDeltaTime);

        } else {
            this._currWaitSyncTime += fixedDeltaTime;
            if (this._currWaitSyncTime < this.SERVER_SYNC_TIMEP_TERM) {
                return;
            }

            this._currWaitSyncTime = 0;
            if( this._forceSync || this._isMoved || this._isJumped || this.CheckMovePose()) {
                this._forceSync = false;
                MultiPlay.SyncTransform(this.gameObject, this.state);
            }
        }
    }

    CheckMovePose(): bool {
        var currentPose = this.transform.position;
        var dir: Vector3 = currentPose - this.lastSyncPose;
        this.lastSyncPose = currentPose;
        return dir.sqrMagnitude >= this.MOVE_THRESHOLD_SQR;
    }

    OnCompletedSnapshot() {
        var serverDataRef = $ref<ServerTransformData>();
        if(this._propDescriptor.TryGetGameObjectServerTransform(this.gameObject, serverDataRef))
        {
            var transformData = serverDataRef.value;
            this.transform.localScale = transformData.scale;
            this._isParking = transformData.moveType < 10;

            if (transformData.isWorldCoord) {
                this.transform.position = transformData.position;
                this.transform.rotation = Quaternion.Euler(transformData.rotation);
            } else {
                this.transform.localPosition = transformData.position;
                this.transform.localRotation = Quaternion.Euler(transformData.rotation);
            }

            // 이프스퀘어 배치 시, BG->FG 과정에서 위치 틀어지는 문제 수정
            if(this._isParking) {
                // 지면 검출
                this.OnGroundCheckUpdate();
                // 공중에 있는 경우
                if(this._isGrounded == false)
                {
                    let pos = this.transform.position;
                    this.transform.position = new Vector3(pos.x, pos.y + this._planDistance, pos.z);
                }
            }

            console.log("[OnCompletedSnapshot]TryGetGameObjectServerTransform - Success / moveType: " + transformData.moveType);
        }
        else
        {
            console.log("[OnCompletedSnapshot]TryGetGameObjectServerTransform - fail");
        }
        this.ResetSyncHistory();
    }
    //#endregion

    //#region Prop Message Lifecycle
    OnPropActivate() {
        this._passengerCount = 0;
    }
    //#endregion

    //#region Component Events
    private OnClick(avatar: AvatarInteractionObject) {
        console.log("[OnClick] - " + avatar.GetUserIdx());

        // >>> C# Vechicle Component 내에 자동 버튼 관련 처리 버그로 임시 처리
        InteractionButtons.RequestButtonsHide(this);
        Lab.RequestBuiltInPropInteractionButtonsHide(this);

        this._vehicle.GetOn(avatar, (resultIdx)=> {
            InteractionButtons.RequestButtonsShow(this);
            Lab.RequestBuiltInPropInteractionButtonsShow(this);
        });
        // >>> 
    }

    public CheckMountInfo(avatar: AvatarInteractionObject) {
        console.log("[CheckMountInfo] MountInfo.length: " + this._mountInfo.length);
        for(var i=0; i< this._mountInfo.length; i++) {
            let v = this._mountInfo[i];
            if(v.GetOwnerAvatar() == avatar) {
                console.log("[CheckMountInfo] OnDismountVehicle - UserIdx: " + avatar.GetUserIdx());
                v.OnDismountVehicle(avatar);
            }

        }
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

        this.CheckMountInfo(avatar);

        console.log("[OnMountVehicle] - Main UserIdx: " + avatar.GetUserIdx());
        this.ResetSyncHistory();

        this._ownerAvatar = avatar;
        if (this._ownerAvatar.IsMine) {
            MultiPlay.SyncTransform(this.gameObject, this.state);
            UserInput.RequestEmotionUIHide(this);
            UserInput.RequestJoystickInput(this, this._joystickInput);
            UserInput.RequestJumpInput(this, this._jumpInput);
            if (this.UseJumpBtn == false) {
                UserInput.RequestJumpButtonHide(this);
            }
        }

        var avatarForm = this._getOnPivPost.y
        if(this.UseAvatarHeightRaito)
        {
            avatarForm += (1 - this._ownerAvatar.HeightRatio);
        }

        this._vehicle.GetOnPivot.localPosition = new Vector3(this._getOnPivPost.x, avatarForm, this._getOnPivPost.z);

        if (this.AvatarVehicleRuntimeAnimator != undefined) {
            this._avatarAnimator = this._ownerAvatar.GetComponentInChildren<Animator>();
            this._originRuntimeAnimator = this._avatarAnimator.runtimeAnimatorController;
            this._ownerAvatar.SwitchAnimator(this.AvatarVehicleRuntimeAnimator);
        }

        this.UpdatePassengerCount(avatar, true, true, this);
    }

    public override OnDismountVehicle(avatar: AvatarInteractionObject) {
        if (this._ownerAvatar == undefined) return;
        if (this._ownerAvatar != avatar) return;

        console.log("[OnDismountVehicle] - Main UserIdx: " + avatar.GetUserIdx());

        this.state = EVehicleState.Idle;
        this._isMoved = false;
        this.OnAnimatorUpdate();

        // Sub Template에게 현재 Vehicle 상태 업데이트
        this.VehicleSubTemplates.forEach(sub => {
            sub.OnStateUpdate(this.state);
        })

        if (this._originRuntimeAnimator != undefined) {
            this._ownerAvatar.SwitchAnimator(this._originRuntimeAnimator);
        }

        // UserInput 해제 처리
        if (this._ownerAvatar.IsMine) {
            UserInput.RequestEmotionUIShow(this);
            UserInput.ReleaseJoystickInput(this, this._joystickInput);
            UserInput.ReleaseJumpInput(this, this._jumpInput);

            if (this.UseJumpBtn == false) {
                UserInput.RequestJumpButtonShow(this);
            }
        }

        this._vehicle.GetOnPivot.localPosition = this._getOnPivPost;

        this.UpdatePassengerCount(avatar, false, true, this);

        this._originRuntimeAnimator = undefined;
        this._avatarAnimator = undefined;
        this._ownerAvatar = undefined;
        this._currWaitSyncTime = 0;

        this.ResetSyncHistory();
    }

    public UpdatePassengerCount(avatar: AvatarInteractionObject, isMount: bool, isOperator: bool, instance: VehicleBaseTemplate) {
        if (isMount) {
            this._passengerCount++;
            this._passengerCount = Mathf.Min(this._passengerCount, this.VehicleSubTemplates.length + 1);
            this.MountEventHandler.Invoke(avatar, this._passengerCount, isOperator);
            this._isParking = false;
            this._mountInfo.push(instance);
        } else {
            this._passengerCount--;
            this._passengerCount = Mathf.Max(this._passengerCount, 0);
            this.DismountEventHandler.Invoke(avatar, this._passengerCount, isOperator);
            let idx = this._mountInfo.indexOf(instance);
            this._mountInfo = this._mountInfo.splice(idx, 1);
        }
    }
    //#endregion

    //#region State Update
    private groundHit: IFSRaycastHit = new IFSRaycastHit();
    private OnGroundCheckUpdate() {
        if(this.HitCollider != undefined){
            this.HitCollider.enabled = false;
        }

        var absDistance: float = Mathf.Infinity;
        var planDistance: float = Mathf.Infinity;
        let defaultPos = this.transform.position + Vector3.up * this.GroundCheckHeight;
        let forward = this.transform.forward;

        let startPose1: Vector3 = defaultPos + forward * this.GroundCheckOffset;
        let startPose2: Vector3 = defaultPos + forward * -this.GroundCheckOffset;

        if (this.groundHit.Raycast(startPose1, Vector3.down, Mathf.Infinity, this._layerMask.value)) {
            let distance = this.groundHit.distance - this.GroundCheckHeight;
            let abs = Mathf.Abs(distance);
            planDistance = distance;
            absDistance = abs;
        }

        if (this.groundHit.Raycast(startPose2, Vector3.down, Mathf.Infinity, this._layerMask.value)) {
            let distance = this.groundHit.distance - this.GroundCheckHeight;
            let abs = Mathf.Abs(distance);

            if(planDistance > distance)
            {
                planDistance = distance;
                absDistance = abs;
            }
        }

        if(this.HitCollider != undefined){
            this.HitCollider.enabled = true;
        }

        if(planDistance == Mathf.Infinity)
        {
            planDistance = 0;
        }

        this._isGrounded = absDistance <= this.GROUND_THRESHOLD;
        this._planDistance = planDistance * -1;
    }

    // 탈 것의 애니메이션 상태를 업데이트
    private OnAnimatorUpdate() {
        switch (this.state) {
            case EVehicleState.Idle:
                if (this.VehicleAnimator != undefined) {
                    this.VehicleAnimator.SetBool("IsWalking", false);
                    this.VehicleAnimator.SetBool("IsJumping", false);
                }

                if (this._avatarAnimator != undefined) {
                    this._avatarAnimator.SetBool("IsWalking", false);
                    this._avatarAnimator.SetBool("IsJumping", false);
                }
                break;

            case EVehicleState.Move:
                if (this.VehicleAnimator != undefined) {
                    this.VehicleAnimator.SetBool("IsWalking", true);
                    this.VehicleAnimator.SetBool("IsJumping", false);
                }

                if (this._avatarAnimator != undefined) {
                    this._avatarAnimator.SetBool("IsWalking", true);
                    this._avatarAnimator.SetBool("IsJumping", false);
                }
                break;

            case EVehicleState.JumpIdle:
                if (this.VehicleAnimator != undefined) {
                    this.VehicleAnimator.SetBool("IsWalking", false);
                    this.VehicleAnimator.SetBool("IsJumping", true);
                }

                if (this._avatarAnimator != undefined) {
                    this._avatarAnimator.SetBool("IsWalking", false);
                    this._avatarAnimator.SetBool("IsJumping", true);
                }
                break;

            case EVehicleState.JumpMove:
                if (this.VehicleAnimator != undefined) {
                    this.VehicleAnimator.SetBool("IsWalking", true);
                    this.VehicleAnimator.SetBool("IsJumping", true);
                }

                if (this._avatarAnimator != undefined) {
                    this._avatarAnimator.SetBool("IsWalking", true);
                    this._avatarAnimator.SetBool("IsJumping", true);
                }
                break;
        }
    }

    


    // 탈 것의 상태를 업데이트
    private OnStateUpdate(): bool {
        if(this.state == EVehicleState.Action) return true;

        var oldState = this.state;
        var isJump = (this._isJumped || (this.state == EVehicleState.JumpIdle || this.state == EVehicleState.JumpMove));
        if (isJump && this._isGrounded == false) {
            this.state = this._isMoved ? EVehicleState.JumpMove : EVehicleState.JumpIdle;
        } else {
            this.state = this._isMoved ? EVehicleState.Move : EVehicleState.Idle;
        }
        return oldState != this.state;
    }
    //#endregion

    //#region Vehicle Transform Sync
    private ResetSyncHistory() {
        this.syncHistories = [];
        this.syncReceiveTimeHistories = [];
        this._lastReceiveHistory = undefined;
        this._lastReceiveTime = undefined;
        this._currentHistory = undefined;
        this._currentReceiveTime = undefined;
        this._complateHistory = undefined;
        this._complateReceiveTime = undefined;
        this.lastSyncPose = undefined;
    }

    private OnSyncTransform(history: ServerTransformHistory[]) {

        if (this.Synchronization == false) return; //동기화 기능이 꺼져있으면 수신받지 않는다.
        if (history == null || history.length == 0) return;
        
        var lastIdx = history.length-1;
        var transformData = history[lastIdx].transformData;

        if(transformData.moveType < 10) {
            console.log("[OnSyncTransform][Trigger System] moveType: "+transformData.moveType +" / PassengerCount: "+ this._passengerCount);

            if(transformData.moveType == 7) {
                if (Land.connectSession == Land.ConnectSession.ifHome) {
                    if(this.TeleportVFX_From != undefined) {
                        this.TeleportVFX_From.transform.position =  this.transform.position;
                        this.TeleportVFX_From.Play();
                    }
                }
    
                this.transform.localScale = transformData.scale;
                this._isParking = true;

                if (Land.connectSession == Land.ConnectSession.ifHome) {
                    if(this.TeleportVFX_To != undefined) {
                        this.TeleportVFX_To.Play();
                    }
                }
                
                if (transformData.isWorldCoord) {
                    this.transform.position = transformData.position;
                    this.transform.rotation = Quaternion.Euler(transformData.rotation);
                } else {
                    this.transform.localPosition = transformData.position;
                    this.transform.localRotation = Quaternion.Euler(transformData.rotation);
                }
            }
            return;
        }

        if (this._ownerAvatar == null || this._ownerAvatar.IsNull == true) {
            return;
        }

        //소유자가 아닐 경우에만 위치 정보를 수신
        if(this._ownerAvatar.IsMine == false) {
            var receiveTime = MultiPlay.Time;
            for (var i = 0; i < history.length; i++)
            {
                this.syncHistories.push(history[i]);
                this.syncReceiveTimeHistories.push(receiveTime);
            }
            this._lastReceiveHistory = history[history.length - 1];
            this._lastReceiveTime = receiveTime;
        }
    }

    private VehicleReceiveUpdate(fixedDeltaTime: float) {
        var useNextPoint = false;
        if (this._currentHistory == undefined) {
            if (this.syncHistories.length == 0) {
                this._isMoved = false;
                return;
            }

            this._currentReceiveTime = this.syncReceiveTimeHistories.shift();
            this._currentHistory = this.syncHistories.shift();
            this.state = this._currentHistory.transformData.moveType as EVehicleState;
            useNextPoint = true;
        }

        // Sync 데이터가 기준치 이상 쌓일 경우 처리
        if (this.syncHistories.length >= this.MAX_SYNC_COUNT) {
            this._currentHistory = this._lastReceiveHistory;
            this._currentReceiveTime = this._lastReceiveTime;

            this.syncHistories = [];
            this.syncReceiveTimeHistories = [];

            useNextPoint = true;
        }

        var transformData = this._currentHistory.transformData;
        var historyPosition = transformData.position;
        var historyRotation = Quaternion.Euler(transformData.rotation);
        var historyScale = transformData.scale;

        if (transformData.isWorldCoord) {
            var currentPosition = this.transform.position;
            var currentRotation = this.transform.rotation;
        } else {
            var currentPosition = this.transform.localPosition;
            var currentRotation = this.transform.localRotation;
        }
        var currentScale = this.transform.localScale;
        var dirSqrMagnitude: float = (historyPosition - currentPosition).sqrMagnitude;
        if (dirSqrMagnitude < this.MAX_DISTANCE_SQR) {
            if (useNextPoint) {
                var serverTerm = this.SERVER_SYNC_TIMEP_TERM;
                //if (this._complateReceiveTime != undefined && this._currentReceiveTime != undefined) {
                //    var receiveTerm = this._currentReceiveTime - this._complateReceiveTime;
                //    serverTerm = Mathf.Min(serverTerm, receiveTerm);
                //}
                //console.log(">>>[VehicleReceiveUpdate] serverTerm: " + serverTerm);
                this._estimatedSpeed = Vector3.Distance(currentPosition, historyPosition) / serverTerm;
                this._estimatedRotSpeed = Quaternion.Angle(currentRotation, historyRotation) / serverTerm;
                this._estimatedScaleSpeed = Vector3.Distance(currentScale, historyScale) / serverTerm;

                var oneWayRTT = MultiPlay.Ping * 0.5 * 0.001;
                var SERVER_PING_SCALA = 1 + oneWayRTT;

                console.log("SERVER_PING_SCALA: " + SERVER_PING_SCALA);
                this._estimatedSpeed *= SERVER_PING_SCALA;
                this._estimatedRotSpeed *= SERVER_PING_SCALA;
                this._estimatedScaleSpeed *= SERVER_PING_SCALA;

                this._copy_estimatedSpeed = this._estimatedSpeed;
            }

            // 움직임을 인지 하는 최소 거리
            this._isMoved = dirSqrMagnitude >= this.MOVE_THRESHOLD_SQR;

            // 좌표간의 위치 보간
            currentPosition = Vector3.MoveTowards(currentPosition, historyPosition, fixedDeltaTime * this._estimatedSpeed);
            currentRotation = Quaternion.RotateTowards(currentRotation, historyRotation, fixedDeltaTime * this._estimatedRotSpeed);
            currentScale = Vector3.MoveTowards(currentScale, historyScale, fixedDeltaTime * this._estimatedScaleSpeed);

        } else {
            // 거리가 멀 경우 바로 이동
            currentPosition = historyPosition;
            currentRotation = historyRotation;
            currentScale = historyScale;

            this._isMoved = false;
        }

        if (transformData.isWorldCoord) {
            this.transform.position = currentPosition;
            this.transform.rotation = currentRotation;
        } else {
            this.transform.localPosition = currentPosition;
            this.transform.localRotation = currentRotation;
        }
        this.transform.localScale = currentScale;

        // 수행 완료
        if (this._isMoved == false) {
            this._copy_estimatedSpeed = 0;
            this._complateHistory = this._currentHistory;
            this._complateReceiveTime = this._currentReceiveTime;
            this._currentHistory = undefined;
            this._currentReceiveTime = undefined;
        }

        //if (currentPosition == historyPosition && currentRotation == historyRotation && currentScale == historyScale) {
        //    this._complateHistory = this._currentHistory;
        //    this._complateReceiveTime = this._currentReceiveTime;
        //    this._currentHistory = undefined;
        //    this._currentReceiveTime = undefined;
        //}
    }
    //#endregion

    //#region UserInput Noty
    private OnEventJoystickUpdate(inputVector: Vector2) {
        this._isMoved = true;
        this.JoystickUpdateEventHandler.Invoke(inputVector);
    }

    private OnEventJoystickStop() {
        this._isMoved = false;
        this.JoystickStopEventHandler.Invoke();
    }

    private OnEventJumpUp() {
        this._isJumped = false;
        this.JumpUpEventHandler.Invoke();
    }

    private OnEventJumpDown() {
        this._isJumped = true;
        this.JumpDownEventHandler.Invoke();
    }

    private OnEventJumpPress() {
        this.JumpPressEventHandler.Invoke();
    }

    private OnEventJumpClick() {
        this.JumpClickEventHandler.Invoke();
    }
    //#endregion


    //#region Public Getter
    public GetEstimatedSpeed(): float {
        return this._copy_estimatedSpeed;
    }

    public GetIsMoved(): bool {
        return this._isMoved;
    }

    public GetIsJumped(): bool {
        return this._isJumped;
    }

    public GetVehilce(): Vehicle{
        return this._vehicle;
    }

    public GetAvatarAnimator(): Animator {
        return this._avatarAnimator;
    }

    public override GetOwnerAvatar(): AvatarInteractionObject {
        return this._ownerAvatar;
    }

    public GetVehicleState(): EVehicleState{
        return this.state;
    }


    //#endregion

    //#region public Setter
    public ChangeVehicleState(changeState: EVehicleState): void{
        this.state = changeState;
    }
    //#endregion

};