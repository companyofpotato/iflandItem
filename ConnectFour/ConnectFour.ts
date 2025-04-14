import { Animator, Application, AudioClip, AudioSource, Camera, Color, Coroutine, Debug, GameObject, Input, KeyCode, Material, Mathf, MeshRenderer, Physics, Quaternion, Ray, RaycastHit, RuntimePlatform, Texture, Transform, Vector2, Vector3, WaitForSeconds } from 'UnityEngine'
import { ECompareToken, IFSBehaviour } from 'ifland.ScriptEngine'
import ConnectFourButton from './ConnectFourButton';
import { AvatarInteractionObject, CameraControl, MultiPlay, Players, Props, RequestResult } from 'ifland.PropEngine';
import ConnectFourNameTagManager from './ConnectFourNameTagManager';
import ConnectFourRenderQueue from './ConnectFourRenderQueue';
import ConnectFourSyncData from './ConnectFourSyncData';
import ConnectFourChip from './ConnectFourChip';
import { Image } from 'UnityEngine.UI';

export enum ChipColor
{
    Gold = 1,
    Silver = 2
}

enum BoardState
{
    Deactivate,
    Bingo,
    Full
}

export default class ConnectFour extends IFSBehaviour
{
    @Header("Other Class")
    public connectFourNameTagManager : ConnectFourNameTagManager;
    public connectFourRenderQueue : ConnectFourRenderQueue;
    public connectFourChip : ConnectFourChip
    @Space(10)

    @Header("Values")
    public maxDistance : float;
    public rowNum : int;
    public colNum : int;
    public goldColor : Color;
    public silverColor : Color;
    @Space(10)

    @Header("Preview")
    public previewGuideObject : GameObject;
    public chipPreviewRenderer : MeshRenderer;
    public chipGold : Texture;
    public chipSilver : Texture;
    public coneGold : Texture;
    public coneSilver : Texture;
    public coneRendererList : MeshRenderer[];
    private coneCounts : number;
    public interval : float = 0;
    private waitInterval : WaitForSeconds;
    @Space(10)
    
    @Header("Touch Guide")
    public touchGuideObject : GameObject;
    public touchGuideClickImageList : Image[];
    public touchGuideShowWaitSeconds : float = 0;
    private touchGuideWait : WaitForSeconds;
    @Space(10)

    @Header("NameTag")
    public nameTagParentObject : GameObject;
    @Space(10)

    @Header("Chip Creation / Bingo")
    public columnList : GameObject[];
    public chipFXTransform : Transform;
    public chipFXMeshRenderer : MeshRenderer;
    public chipBoard : GameObject;
    public chipCreationEmotion : string;
    public chipBingoEmotion : string;
    @Space(10)

    @Header("Animator")
    public chipFXAnimator : Animator;
    public boardAnimator : Animator;
    @Space(10)

    @Header("Sound")
    public connectFourAudioSource : AudioSource;
    public boardActivateSound : AudioClip;
    public winnerNameTagSound : AudioClip;
    public chipCreateStartSound : AudioClip;
    public bingoSound : AudioClip;
    @Space(10)

    private isMouseDown : bool;
    private hitButton : ConnectFourButton;
    private pushingColumnIndex : int;
    private isItemActive : bool;
    private isButtonUsable : bool;
    private isPaused : bool;
    private isFront : bool;
    private isMobile : bool;
    private isPlayingInteraction : bool;
    private isCameraFixed : bool;
    private mainCameraTransform : Transform;
    private cameraPosition : Vector3;
    private itemTransform : Transform;
    private itemPosition : Vector3;
    private angle : float;
    private rotateSpeed : number;

    private localSyncData : ConnectFourSyncData;
    private cachedSyncData : ConnectFourSyncData;
    private currentChipColor : int;
    private currentBoardState : BoardState;
    private myPlayer : AvatarInteractionObject;

    private chipHeight : float[] = [-2.55, -2.15, -1.75, -1.35, -0.964, -0.545]; // 칩 생성시 높이
    private chipCreationAniLength : int[] = [1584, 1284, 1284, 1200, 1117, 1034]; // 칩 생성 애니메이션 길이
    private chipBingoAniLength : int = 1000;
    private boardDeactivateAniLength : int = 1000;
    private boardActivateAniLength : int = 1000;
    private boardBingoTime : int = 3000;
    private boardFullTime : int = 1000;

    private syncCoroutine : Coroutine;
    private boardCoroutine : Coroutine
    private chipCoroutine : Coroutine;
    private previewCoroutine : Coroutine;
    private touchGuideCoroutine : Coroutine;
    private timeGap : int;
    private boardFullWait : WaitForSeconds = new WaitForSeconds(this.boardFullTime * 0.001);
    private chipBingoWait : WaitForSeconds = new WaitForSeconds(this.chipBingoAniLength * 0.001);

    private chipBoardList : GameObject[][] = [[null, null, null, null, null, null, null, null, null],       // [0,0],[0,1],[0,2],[0,3],[0,4],[0,5],[0,6],[0,7],[0,8]
    [null, null, null, null, null, null, null, null, null],       // [1,0],[1,1],[1,2],[1,3],[1,4],[1,5],[1,6],[1,7],[1,8]
    [null, null, null, null, null, null, null, null, null],       // [2,0],[2,1],[2,2],[2,3],[2,4],[2,5],[2,6],[2,7],[2,8]
    [null, null, null, null, null, null, null, null, null],       // [3,0],[3,1],[3,2],[3,3],[3,4],[3,5],[3,6],[3,7],[3,8]
    [null, null, null, null, null, null, null, null, null],       // [4,0],[4,1],[4,2],[4,3],[4,4],[4,5],[4,6],[4,7],[4,8]
    [null, null, null, null, null, null, null, null, null]];      // [5,0],[5,1],[5,2],[5,3],[5,4],[5,5],[5,6],[5,7],[5,8]    
    private chipBoardUsingList : GameObject[] = []; // 사용 중인 칩 오브젝트 목록
    private chipBoardSaveList : GameObject[] = []; // 생성했지만 사용 중은 아닌 칩 오브젝트 목록
    private bingoChips : GameObject[] = [null, null, null, null];

    private CFLog(str : string)
    {
        Debug.Log("[ConnectFour] " + str);
    }

    OnApplicationPause(isPause : bool)
    {
        this.CFLog("Pause : " + isPause);
        if(isPause)
        {
            this.StopSyncCoroutine();
            this.StopAll();
            this.TryReleaseAuthority();
        }
        else
        {
            this.isPaused = true;
        }
    }

    private Init()
    {
        this.myPlayer = Players.GetMyPlayer();
        this.isMouseDown = false;
        this.isButtonUsable = true;
        this.isPaused = false;
        this.isPlayingInteraction = false;
        this.pushingColumnIndex = -1;
        this.connectFourRenderQueue.SetRenderQueue();
        this.connectFourNameTagManager.Init();
        this.connectFourChip.CreationEndCallback = this.ChipCreateAnimationEnd;
        this.localSyncData = new ConnectFourSyncData();
        this.waitInterval = new WaitForSeconds(this.interval);
        this.touchGuideWait = new WaitForSeconds(this.touchGuideShowWaitSeconds);
        this.ResetSyncData();
        this.ResetLocalData();
        this.ReadyToPlay();
        this.coneCounts = this.coneRendererList.length;

        this.mainCameraTransform = Camera.main.transform;
        this.itemTransform = this.transform;
        
        this.angle = this.GetCameraItemAngle();
        if(-90 <= this.angle && this.angle < 90)
        {
            this.nameTagParentObject.transform.localRotation = Quaternion.Euler(0, 180, 0);
            this.touchGuideObject.transform.localRotation = Quaternion.Euler(0, 180, 0);
            this.isFront = true;
        }
        else
        {
            this.nameTagParentObject.transform.localRotation = Quaternion.Euler(0, 0, 0);
            this.touchGuideObject.transform.localRotation = Quaternion.Euler(0, 0, 0);
            this.isFront = false;
        }
    }

//#region Life Cycle
    Awake()
    {
        this.isItemActive = true;
        this.isMobile = Application.platform == RuntimePlatform.Android || Application.platform == RuntimePlatform.IPhonePlayer;
        this.CFLog("Mobile Device : " + this.isMobile);
        this.rotateSpeed = CameraControl.RotateSpeed;
        this.isCameraFixed = false;
    }

    private GetCameraItemAngle() : float
    {
        this.cameraPosition = this.mainCameraTransform.position;
        this.cameraPosition.y = 0;
        this.itemPosition = this.itemTransform.position;
        this.itemPosition.y = 0;

        return Vector3.SignedAngle(Vector3.op_Subtraction(this.cameraPosition, this.itemPosition), this.itemTransform.forward, Vector3.up);
    }

    FixCameraRotate(isFixOn : bool)
    {
        if(isFixOn)
        {
            if(this.isCameraFixed == false)
            {
                CameraControl.SetRotationSpeed(0);
                this.isCameraFixed = true;
            }
        }
        else
        {
            if(this.isCameraFixed)
            {
                CameraControl.SetRotationSpeed(this.rotateSpeed);
                this.isCameraFixed = false;
            }
        }
    }

    Update()
    {
        this.angle = this.GetCameraItemAngle();
        if(-90 <= this.angle && this.angle < 90)
        {
            this.nameTagParentObject.transform.localRotation = Quaternion.Euler(0, 180, 0);
            this.touchGuideObject.transform.localRotation = Quaternion.Euler(0, 180, 0);
            this.isFront = true;
        }
        else
        {
            this.nameTagParentObject.transform.localRotation = Quaternion.Euler(0, 0, 0);
            this.touchGuideObject.transform.localRotation = Quaternion.Euler(0, 0, 0);
            this.isFront = false;
        }

        if(Input.GetMouseButtonDown(0))
        {
            this.isMouseDown = true;
            this.pushingColumnIndex = -1;
        }

        if(Input.GetMouseButtonUp(0))
        {
            this.FixCameraRotate(false);
            if(this.pushingColumnIndex >= 0 && this.isButtonUsable)
            {
                this.SetPreviewGuideActive(false);
                this.isButtonUsable = false;
                this.TrySync();
            }

            this.isMouseDown = false;
            this.pushingColumnIndex = -1;
        }

        if(this.CheckBoardUsable())
        {
            if(this.isMobile)
            {
                if(Input.touchCount != 1)
                {
                    this.CFLog("Touch Count is more than One");
                    return;
                }
            }
            var MaxDistance: float = 1000000;
            var ray : Ray = CameraControl.Camera.ScreenPointToRay(Input.mousePosition);
            var hit : RaycastHit;
            var hit2 = $ref(hit);         
            var layerMask: int = 1 << 10;
            layerMask |= 1 << 5;

            if(Physics.Raycast(ray.origin, ray.direction, hit2, MaxDistance, layerMask))
            {
                var hitInfo = $unref(hit2);
                this.hitButton = hitInfo.collider.gameObject.GetComponent<ConnectFourButton>();
                if(this.hitButton != null && this.hitButton.PropInstaceID == this.PropInstaceID)
                {
                    this.FixCameraRotate(true);
                    if(this.pushingColumnIndex != this.hitButton.columnIndex)
                    {
                        this.CFLog("column index : " + this.hitButton.columnIndex);
                        this.pushingColumnIndex = this.hitButton.columnIndex;
                        if(this.localSyncData.chipCounts[this.pushingColumnIndex] < 6)
                        {
                            this.SetPreviewGuideActive(true);
                            this.SetTouchGuideActive(false);
                        }
                        else
                        {
                            this.CFLog("full column");
                            this.FixCameraRotate(false);
                            this.pushingColumnIndex = -1;
                            this.isMouseDown = false;
                            this.SetPreviewGuideActive(false);
                            this.SetTouchGuideActive(true);
                        }
                    }
                }
                else
                {
                    this.isMouseDown = false;
                    if(this.pushingColumnIndex != -1)
                    {
                        this.CFLog("no column");
                        this.FixCameraRotate(false);
                        this.pushingColumnIndex = -1;
                        this.SetPreviewGuideActive(false);
                        this.SetTouchGuideActive(true);
                    }
                }
            }
            else
            {
                this.isMouseDown = false;
                if(this.pushingColumnIndex != -1)
                {
                    this.CFLog("no column");
                    this.FixCameraRotate(false);
                    this.pushingColumnIndex = -1;
                    this.SetPreviewGuideActive(false);
                    this.SetTouchGuideActive(true);
                }
            }
        }
    }

    private CheckBoardUsable() : bool
    {
        if(this.myPlayer == null || this.myPlayer.IsBlockUseProp || this.myPlayer.IsSit || this.myPlayer.IsGrab || this.myPlayer.IsOnVehicle || this.isPlayingInteraction)
        {
            return false;
        }

        return this.isMouseDown && this.isItemActive && this.isButtonUsable && this.CheckDistance();
    }

    // 아이템과 아바타의 거리 확인
    private CheckDistance() : bool
    {
        if(this.myPlayer.GetWorldPosition() != null)
        {
            var distance = Vector3.Distance(this.gameObject.transform.position, this.myPlayer.GetWorldPosition());
            if(distance < this.maxDistance)
            {
                return true;
            }
            else
            {
                return false;
            }
        }
        
        return false;

    }

//#endregion

//#region 오브젝트 활성화/비활성화
    
    // 아이템 On 시 호출
    OnPropActivate()
    {
        this.CFLog("Prop Activate");
        if(this.isItemActive)
        {
            this.Init();
        }
        else
        {
            if(this.myPlayer != null && this.myPlayer.IsMaster)
            {
                this.ResetSyncData();
                MultiPlay.Sync(this, this.localSyncData);
            }
        }
        this.isItemActive = true;
    }

    // 아이템 Off 시 호출
    OnPropDeactivate()
    {
        this.CFLog("Prop Deactivate");
        this.currentBoardState = BoardState.Deactivate;
        this.StopSyncCoroutine();
        this.StopAll();
        this.DeactivateBoard(false);
        this.ResetSyncData();
        this.ResetLocalData();
        this.isItemActive = false;
    }

    OnDecorateModeChanged(isDecorateMode : bool)
    {
        this.CFLog("Decorate Mode Changed to " + isDecorateMode);
        if(isDecorateMode)
        {
            this.currentBoardState = BoardState.Deactivate;
            this.StopSyncCoroutine();
            this.StopAll();
            this.DeactivateBoard(false);
            this.ResetSyncData();
            this.ResetLocalData();
            this.isItemActive = false;
        }
        else
        {
            if(this.isItemActive)
            {
                this.Init();
            }
            else
            {
                if(this.myPlayer != null && this.myPlayer.IsMaster)
                {
                    this.ResetSyncData();
                    MultiPlay.Sync(this, this.localSyncData);
                }
            }
            this.isItemActive = true;
        }
    }

    private ResetLocalData()
    {
        this.CFLog("Reset Local Data");
        this.nameTagParentObject.transform.SetParent(this.transform);
        this.connectFourNameTagManager.HideNameTag();
        this.chipBoardUsingList.forEach(element =>
        {
            element.SetActive(false); // 비활성화 후 Save List에 옮기도록 기능 추가
            GameObject.Destroy(element); // 이건 나중에 옮기는 기능 생기면 필요없음
        });

        this.chipBoardList = [[null, null, null, null, null, null, null, null, null],       // [0,0],[0,1],[0,2],[0,3],[0,4],[0,5],[0,6],[0,7],[0,8]
        [null, null, null, null, null, null, null, null, null],       // [1,0],[1,1],[1,2],[1,3],[1,4],[1,5],[1,6],[1,7],[1,8]
        [null, null, null, null, null, null, null, null, null],       // [2,0],[2,1],[2,2],[2,3],[2,4],[2,5],[2,6],[2,7],[2,8]
        [null, null, null, null, null, null, null, null, null],       // [3,0],[3,1],[3,2],[3,3],[3,4],[3,5],[3,6],[3,7],[3,8]
        [null, null, null, null, null, null, null, null, null],       // [4,0],[4,1],[4,2],[4,3],[4,4],[4,5],[4,6],[4,7],[4,8]
        [null, null, null, null, null, null, null, null, null]];      // [5,0],[5,1],[5,2],[5,3],[5,4],[5,5],[5,6],[5,7],[5,8]    
        this.chipBoardUsingList = []; // 사용 중인 칩 오브젝트 목록
        this.chipBoardSaveList = []; // 생성했지만 사용 중은 아닌 칩 오브젝트 목록
        this.bingoChips = [null, null, null, null];
    }

    // 터치 유도 오브젝트 활성화 여부 설정
    private SetTouchGuideActive(state : bool)
    {
        if(this.touchGuideCoroutine != null)
        {
            this.StopCoroutine(this.touchGuideCoroutine);
            this.touchGuideCoroutine = null;
        }

        if(state)
        {
            if(this.isItemActive == false || this.isButtonUsable == false || this.isPlayingInteraction)
            {
                this.CFLog("Touch Guide can not be active");
                return;
            }
            this.touchGuideCoroutine = this.StartCoroutine(this.WaitTouchGuideCoroutine);
        }
        else
        {
            this.touchGuideObject.SetActive(false);
        }
    }

    private *WaitTouchGuideCoroutine()
    {
        yield this.touchGuideWait;
        this.touchGuideObject.SetActive(true);
    }

    // 미리보기 오브젝트 활성화 여부 설정
    private SetPreviewGuideActive(state : bool)
    {
        this.chipPreviewRenderer.enabled = state;

        if(state && this.pushingColumnIndex >= 0)
        {
            this.previewGuideObject.transform.SetParent(this.hitButton.transform);
            this.previewGuideObject.transform.localPosition = Vector3.zero;

            if(this.previewCoroutine != null)
            {
                this.StopCoroutine(this.previewCoroutine);
                this.previewCoroutine = null;
            }

            this.previewCoroutine = this.StartCoroutine(this.PreviewConeFade());

        }
        else
        {
            if(this.previewCoroutine != null)
            {
                this.StopCoroutine(this.previewCoroutine);
                this.previewCoroutine = null;
            }
            for(var idx = 0;idx < this.coneCounts;idx++)
            {
                this.coneRendererList[idx].enabled = false;
            }
        }
    }

    private *PreviewConeFade()
    {
        var coneActiveCounts = this.coneRendererList.length - this.localSyncData.chipCounts[this.pushingColumnIndex];

        for(var idx = 0;idx < this.coneCounts;idx++)
        {
            this.coneRendererList[idx].enabled = true;
            this.coneRendererList[idx].material.SetFloat("_Alpha", 0.1);
            this.coneRendererList[idx].material.SetFloat("_Brightness", 0.0);
        }

        while(true)
        {
            for(var idx = 0;idx < this.coneCounts;idx++)
            {
                
                if(idx - 3 >= 0)
                {
                    this.coneRendererList[idx - 3].material.SetFloat("_Alpha", 0.1);
                    this.coneRendererList[idx - 3].material.SetFloat("_Brightness", 0.0);
                }
                
                if(idx - 2 >= 0)
                {
                    this.coneRendererList[idx - 2].material.SetFloat("_Alpha", 0.4);
                    this.coneRendererList[idx - 2].material.SetFloat("_Brightness", -0.2);
                }
                
                if(idx - 1 >= 0)
                {
                    this.coneRendererList[idx - 1].material.SetFloat("_Alpha", 0.7);
                    this.coneRendererList[idx - 1].material.SetFloat("_Brightness", -0.2);
                }

                if(idx < coneActiveCounts)
                {
                    this.coneRendererList[idx].enabled = true;
                    this.coneRendererList[idx].material.SetFloat("_Alpha", 1.0);
                    this.coneRendererList[idx].material.SetFloat("_Brightness", -0.2);
                }
                else
                {
                    this.coneRendererList[idx].enabled = false; // 배치 가능한 칩이 몇 개 없는 경우에도 원뿔 노출/미노출이 똑같은 속도로 진행됨
                    // break; // 배치 가능한 칩이 몇 개 없는 경우 원뿔 노출/미노출이 빠른 속도로 진행됨
                }

                if(idx + 1 < coneActiveCounts)
                {
                    this.coneRendererList[idx + 1].material.SetFloat("_Alpha", 0.7);
                    this.coneRendererList[idx + 1].material.SetFloat("_Brightness", -0.2);
                }

                if(idx + 2 < coneActiveCounts)
                {
                    this.coneRendererList[idx + 2].material.SetFloat("_Alpha", 0.4);
                    this.coneRendererList[idx + 2].material.SetFloat("_Brightness", -0.2);
                }

                if(idx + 3 < coneActiveCounts)
                {
                    this.coneRendererList[idx + 3].material.SetFloat("_Alpha", 0.1);
                    this.coneRendererList[idx + 3].material.SetFloat("_Brightness", 0.0);
                }
                
                yield this.waitInterval;
            }
            for(var idx = 0;idx < this.coneCounts;idx++)
            {
                this.coneRendererList[idx].material.SetFloat("_Alpha", 0.25);
            }
            yield this.waitInterval;
        }
    }

    private StopSyncCoroutine()
    {
        if(this.syncCoroutine != null)
        {
            this.StopCoroutine(this.syncCoroutine);
            this.syncCoroutine = null;
        }
    }

    private StopAll(finishWithoutCreation : bool = false)
    {
        this.CFLog("Stop All");
        this.FixCameraRotate(false);
        this.chipFXAnimator.Play("Idle", -1, 0);
        this.chipFXMeshRenderer.enabled = false;
        this.SetTouchGuideActive(false);
        this.SetPreviewGuideActive(false);
        this.boardAnimator.Play("IdleOn", -1, 0);
        this.connectFourNameTagManager.HideNameTag();
        if(this.isPlayingInteraction)
        {
            var row = this.localSyncData.row;
            var col = this.localSyncData.col;
            var chipColor = this.localSyncData.chipList[row][col];
            
            if(this.syncCoroutine != null)
            {
                this.CFLog("Force Finish before Process");
                row = this.cachedSyncData.row;
                col = this.cachedSyncData.col;
                chipColor = this.cachedSyncData.chipList[row][col];
            }

            this.CFLog("Force Finish row : " + row + ", col : " + col);
            if(finishWithoutCreation)
            {
                this.CFLog("Don't Create Chip");
            }
            else
            {
                this.CreateChipBoard(row, col, chipColor, false);
            }
            this.isPlayingInteraction = false;
        }
        else
        {
            this.CFLog("Item is not playing interaction");
        }
        if(this.boardCoroutine != null)
        {
            this.StopCoroutine(this.boardCoroutine);
            this.boardCoroutine = null;
        }
        if(this.chipCoroutine != null)
        {
            this.StopCoroutine(this.chipCoroutine);
            this.chipCoroutine = null;
        }
        if(this.previewCoroutine != null)
        {
            this.StopCoroutine(this.previewCoroutine);
            this.previewCoroutine = null;
        }
        if(this.touchGuideCoroutine != null)
        {
            this.StopCoroutine(this.touchGuideCoroutine);
            this.touchGuideCoroutine = null;
        }
    }

//#endregion

//#region 동기화
    private TrySync()
    {
        if(this.SetChipData(this.pushingColumnIndex, this.currentChipColor))
        {
            this.SetOtherSyncData();
            this.CFLog("Sync Try time : " + this.localSyncData.interactTime);
            MultiPlay.SyncWithAuthority(this, this.localSyncData)
            .OnSucceed(() => 
            {
                this.CFLog("Sync Success");
                this.TryReleaseAuthority();
            })
            .OnFailed((result : RequestResult) => 
            {
                this.CFLog("Sync Failed");
                this.RevertSyncData();

                this.isButtonUsable = true;
                this.SetTouchGuideActive(true);

                if(result.result == 64) // 64는 Requset.ResponseType 중의 FAILED_ALREADY_ACQUIRED_PROP_GAMEOBJECT_BY_OTHER이다.
                {
                    this.CFLog("Authority is acquired by other user");
                    this.isButtonUsable = false;
                }
            });
        }
        else
        {
            this.CFLog("Sync Try Failed");
        }
    }
    private TryReleaseAuthority()
    {
        this.CFLog("Release Try time : " + MultiPlay.Timestamp);
        MultiPlay.ReleaseAuthority(this.gameObject)
        .OnSucceed(c =>
        {
            this.CFLog("Release Authority Success");
        })
        .OnFailed(c => 
        {
            this.CFLog("Release Authority Failed");
            if(MultiPlay.IsAuthorityResultSuccess(c.result))
            {
                this.CFLog("Still have Authority. Retry Release")
                this.StartCoroutine(this.RetryReleaseAuthorityCoroutine(1.0))
            }
        })
    }

    *RetryReleaseAuthorityCoroutine(t : float)
    {
        yield new WaitForSeconds(t)
        this.TryReleaseAuthority()
    }

    OnSync(receivedSyncData : ConnectFourSyncData)
    {
        this.CFLog("OnSync Time : " + MultiPlay.Timestamp);
        if(receivedSyncData == null)
        {
            this.CFLog("OnSync : no data");
            return;
        }
        if(this.isItemActive == false)
        {
            this.CFLog("OnSync : Item is not activated");
            return;
        }
        if(this.isPaused)
        {
            this.CFLog("OnSync Duplicated");
            return;
        }
        this.isButtonUsable = false;
        if(this.localSyncData.chipColor == receivedSyncData.chipColor && (receivedSyncData.interactTime - this.localSyncData.interactTime) < this.chipCreationAniLength[this.localSyncData.row])
        {
            this.StopAll(true);
        }
        else
        {
            this.StopAll();
        }

        if(this.syncCoroutine == null)
        {
            this.CFLog("Start OnSync Coroutine");
            this.isPlayingInteraction = true;
            this.cachedSyncData = JSON.parse(JSON.stringify(receivedSyncData));
            this.syncCoroutine = this.StartCoroutine(this.OnSyncCoroutine);
        }
        else
        {
            if(this.cachedSyncData != null)
            {
                if(receivedSyncData.interactTime <= this.cachedSyncData.interactTime)
                {
                    this.CFLog("Cached Data is newer");
                    this.ProcessSyncData(receivedSyncData, false);
                }
                else
                {
                    this.CFLog("Cached Data is older");
                    this.ProcessSyncData(this.cachedSyncData, false);
                    this.cachedSyncData = JSON.parse(JSON.stringify(receivedSyncData));
                }
            }
            else
            {
                this.CFLog("Cached Data is empty");
            }
        }
    }

    *OnSyncCoroutine()
    {
        yield null;
        if(this.cachedSyncData != null)
        {
            this.CFLog("Call cached onsync");
            this.ProcessSyncData(this.cachedSyncData, false, false);
            this.cachedSyncData = null;
        }
        else
        {
            this.CFLog("cache is empty in coroutine");
        }
        this.syncCoroutine = null;
    }

    OnSyncServer(receivedSyncData : ConnectFourSyncData)
    {
        this.isPaused = false;
        this.CFLog("OnSyncServer Time : " + MultiPlay.Timestamp);
        if(receivedSyncData == null)
        {
            this.CFLog("OnSyncServer : no data");
            this.timeGap = MultiPlay.Timestamp;
            this.ActivateBoard(true);
            return;
        }
        if(this.isItemActive == false)
        {
            this.CFLog("OnSync : Item is not activated");
            return;
        }
        this.isButtonUsable = false;
        this.StopSyncCoroutine();
        this.StopAll();
        this.ResetLocalData();

        this.ProcessSyncData(receivedSyncData, true);
    }
//#endregion

//#region 동기화 데이터 처리
    
    // 동기화 데이터 초기화
    private ResetSyncData()
    {
        this.CFLog("Reset Sync Data");
        this.timeGap = 0;
        this.localSyncData.interactTime = -1;
        this.localSyncData.chipColor = -1;
        this.localSyncData.col = -1;
        this.localSyncData.row = -1;
        this.localSyncData.userIdx = -1;
        this.localSyncData.nickname = "";
        this.localSyncData.chipCounts = [0, 0, 0, 0, 0, 0, 0, 0, 0];
        this.localSyncData.chipList = [[0, 0, 0, 0, 0, 0, 0, 0, 0],       // [0,0],[0,1],[0,2],[0,3],[0,4],[0,5],[0,6],[0,7],[0,8]
        [0, 0, 0, 0, 0, 0, 0, 0, 0],       // [1,0],[1,1],[1,2],[1,3],[1,4],[1,5],[1,6],[1,7],[1,8]
        [0, 0, 0, 0, 0, 0, 0, 0, 0],       // [2,0],[2,1],[2,2],[2,3],[2,4],[2,5],[2,6],[2,7],[2,8]
        [0, 0, 0, 0, 0, 0, 0, 0, 0],       // [3,0],[3,1],[3,2],[3,3],[3,4],[3,5],[3,6],[3,7],[3,8]
        [0, 0, 0, 0, 0, 0, 0, 0, 0],       // [4,0],[4,1],[4,2],[4,3],[4,4],[4,5],[4,6],[4,7],[4,8]
        [0, 0, 0, 0, 0, 0, 0, 0, 0]];      // [5,0],[5,1],[5,2],[5,3],[5,4],[5,5],[5,6],[5,7],[5,8]    
    }

    // 해당 열에 칩 생성 가능한지 확인
    // 생성 가능하면 정보 수정
    private SetChipData(col : int, chipColor : int) : bool
    {
        var row = this.localSyncData.chipCounts[col];

        if(row >= 6)
        {
            this.CFLog("Column is Full");
            return false;
        }

        this.localSyncData.row = row;
        this.localSyncData.col = col;
        this.localSyncData.chipColor = chipColor;
        this.localSyncData.chipList[row][col] = chipColor;
        this.localSyncData.chipCounts[col]++;

        return true;
    }

    // 칩 생성 정보 수정한 것 되돌리기
    private RevertSyncData()
    {
        this.localSyncData.chipList[this.localSyncData.row][this.localSyncData.col] = -1;
        this.localSyncData.chipCounts[this.localSyncData.col]--;
        this.localSyncData.col = -1;
        this.localSyncData.row = -1;
    }

    // 칩 생성 정보를 제외한 다른 정보 수정
    private SetOtherSyncData()
    {
        this.localSyncData.interactTime = MultiPlay.Timestamp;
        this.localSyncData.userIdx = Players.GetMyUserIdx();
        this.localSyncData.nickname = Players.GetPlayer(this.localSyncData.userIdx).AvatarNickname;
    }

    // 어떤 것을 동기화하는 데이터인지 확인
    private ProcessSyncData(syncData : ConnectFourSyncData, isOnSyncServer : bool, skipable : bool = true)
    {
        this.CFLog("SyncData Column : " + syncData.col);
        this.localSyncData = JSON.parse(JSON.stringify(syncData));
        this.isPlayingInteraction = true;

        this.timeGap = 0;
        if(skipable)
        {
            this.timeGap = MultiPlay.Timestamp - syncData.interactTime;
        }
        this.CFLog("Time Gap : " + this.timeGap);

        if(syncData.col < 0) // 초기화 동기화 데이터인 경우
        {
            this.currentBoardState = BoardState.Deactivate;
            this.DeactivateBoard(false);
            this.ActivateBoard(true);
        }
        else // 칩 생성 동기화 데이터인 경우
        {
            if(isOnSyncServer)
            {
                this.SetBoard();
            }
            this.CreateChip();
        }

    }
//#endregion

//#region 칩, 보드 관리
    
    // 보드에 생성된 칩들을 배치하여 칩 생성 이전 상태를 동기화한다.
    SetBoard()
    {
        this.CFLog("Set Board");
        for(var colIdx = 0;colIdx < this.colNum;colIdx++)
        {
            var rowCounts = this.localSyncData.chipCounts[colIdx];
            if(rowCounts > 0)
            {
                for(var rowIdx = 0;rowIdx < rowCounts;rowIdx++)
                {
                    if(rowIdx == this.localSyncData.row && colIdx == this.localSyncData.col)
                    {
                        continue; // 이번에 칩을 생성할 위치이므로 이곳은 생략한다.
                    }
                    this.CreateChipBoard(rowIdx, colIdx, this.localSyncData.chipList[rowIdx][colIdx], false);
                }
            }
        }
    }

    // 칩 생성
    CreateChip()
    {
        this.CFLog("Create Chip");
        if(this.localSyncData.chipColor == ChipColor.Gold)
        {
            this.chipFXMeshRenderer.material.mainTexture = this.chipGold;
        }
        else
        {
            this.chipFXMeshRenderer.material.mainTexture = this.chipSilver;
        }

        // 시간차 고려
        if(this.timeGap < this.chipCreationAniLength[this.localSyncData.row])
        {
            this.chipFXMeshRenderer.enabled = true;
            this.chipFXTransform.SetParent(this.columnList[this.localSyncData.col].transform);
            this.chipFXTransform.localPosition = Vector3.zero;
            
            var aio = Players.GetPlayer(this.localSyncData.userIdx);
            if(aio != null && this.localSyncData.userIdx == Players.GetMyUserIdx())
            {
                aio.PlayBuiltInAnimation(this.chipCreationEmotion);
            }


            this.connectFourAudioSource.clip = this.chipCreateStartSound;
            this.connectFourAudioSource.Play();
            this.chipFXAnimator.SetTrigger(this.localSyncData.row + "");
        }
        else
        {
            this.ChipCreateAnimationEnd();
        }

    }

    // 칩이 떨어지는 애니메이션이 종료되고 보드에 실제 칩을 생성한다.
    CreateChipBoard(row : int, col : int, chipColor : ChipColor, isNameTagOn : bool = true)
    {
        this.CFLog("Create ChipBoard row : " + row + ", col : " + col);
        var createdChip = GameObject.Instantiate(this.chipBoard, this.columnList[col].transform) as GameObject;
        this.chipBoardList[row][col] = createdChip;
        this.chipBoardUsingList.push(createdChip);

        createdChip.transform.localPosition = new Vector3(0, this.chipHeight[row], 0);

        this.nameTagParentObject.transform.SetParent(createdChip.transform);
        
        if(this.isFront)
        {
            this.nameTagParentObject.transform.localRotation = Quaternion.Euler(0, 180, 0);
        }
        else
        {
            this.nameTagParentObject.transform.localRotation = Quaternion.Euler(0, 0, 0);
        }

        if(isNameTagOn)
        {
            if(this.timeGap < 1.0)
            {
                this.connectFourNameTagManager.ShowCreatorNameTag(this.localSyncData.nickname, this.localSyncData.chipColor);
            }
            else
            {
                this.connectFourNameTagManager.ShowCreatorNameTag(this.localSyncData.nickname, this.localSyncData.chipColor, false);
            }
        }

        if(chipColor == ChipColor.Gold)
        {
            createdChip.GetComponent<MeshRenderer>().material.mainTexture = this.chipGold;
        }
        else
        {
            createdChip.GetComponent<MeshRenderer>().material.mainTexture = this.chipSilver;
        }
    }

    ChipCreateAnimationEnd()
    {
        this.CFLog("Chip Creation Animation End");
        this.timeGap -= this.chipCreationAniLength[this.localSyncData.row];
        this.CreateChipBoard(this.localSyncData.row, this.localSyncData.col, this.localSyncData.chipColor);

        this.chipFXMeshRenderer.enabled = false;

        if(this.CheckBingo(this.localSyncData.chipColor))
        {
            this.Bingo(this.localSyncData.nickname);
        }
        else
        {
            if(this.CheckBoardFull())
            {
                this.currentBoardState = BoardState.Full;
                this.DeactivateBoard(true);
            }
            else
            {
                this.CFLog("Not Bingo and Board is not full");
                this.isPlayingInteraction = false;
                this.ReadyToPlay();
            }
        }
    }

    ReadyToPlay()
    {
        if(this.localSyncData.chipColor == ChipColor.Gold)
        {
            this.currentChipColor = ChipColor.Silver;
        }
        else
        {
            this.currentChipColor = ChipColor.Gold;
        }
        this.isButtonUsable = true;

        this.ChangePreviewAndGuideColor(this.currentChipColor);
        this.SetTouchGuideActive(true);
    }

    // 보드 활성화
    ActivateBoard(isAnimationOn : bool)
    {
        this.CFLog("Activate Board : " + isAnimationOn + "Time Gap : " + this.timeGap);
        if(isAnimationOn && this.timeGap < this.boardActivateAniLength)
        {
            this.connectFourAudioSource.clip = this.boardActivateSound;
            this.connectFourAudioSource.Play();
            this.boardAnimator.SetTrigger("Activate");
        }
        else
        {
            if(isAnimationOn)
            {
                this.boardAnimator.Play("IdleOn", -1, 0);
            }
            this.BoardActivateAnimationEnd();
        }
    }

    BoardActivateAnimationEnd()
    {
        this.CFLog("Board Activate Animation End");
        this.timeGap -= this.boardActivateAniLength;
        this.ResetSyncData();
        this.isPlayingInteraction = false;
        this.ReadyToPlay();
    }

    // 보드 비활성화
    DeactivateBoard(isAnimationOn : bool)
    {
        this.CFLog("Deactivate Board : " + isAnimationOn + "Time Gap : " + this.timeGap);
        this.SetTouchGuideActive(false);
        this.ResetLocalData();

        if(isAnimationOn && this.timeGap < this.boardDeactivateAniLength)
        {
            this.boardAnimator.SetTrigger("Deactivate");
        }
        else
        {
            if(isAnimationOn)
            {
                this.boardAnimator.Play("IdleOff", -1, 0);
            }
            else
            {
                this.boardAnimator.Play("IdleOn", -1, 0);
            }
            this.BoardDeactivateAnimationEnd();
        }
    }

    BoardDeactivateAnimationEnd()
    {
        this.CFLog("Board Deactivate Animation End State : " + this.currentBoardState);
        this.timeGap -= this.boardDeactivateAniLength;

        switch(this.currentBoardState)
        {
            case BoardState.Deactivate : // 아이템 off로 보드 비활성화
                break;
            case BoardState.Bingo : // 4목 완성으로 보드 비활성화
                this.boardCoroutine = this.StartCoroutine(this.BoardBingoCoroutine);
                break;
            case BoardState.Full : // 보드가 다 차서 보드 비활성화
                this.boardCoroutine = this.StartCoroutine(this.BoardFullCoroutine);
                break;
        }
    }

    private *BoardBingoCoroutine()
    {
        if(this.timeGap < this.boardBingoTime)
        {
            var aio = Players.GetPlayer(this.localSyncData.userIdx);
            if(aio != null && this.localSyncData.userIdx == Players.GetMyUserIdx())
            {
                aio.PlayBuiltInAnimation(this.chipBingoEmotion);
            }

            this.connectFourAudioSource.clip = this.winnerNameTagSound;
            this.connectFourAudioSource.Play();

            this.connectFourNameTagManager.ShowWinnerNameTag(this.localSyncData.nickname);
            if(this.timeGap < 0)
            {
                this.timeGap = 0;
            }
            yield new WaitForSeconds((this.boardBingoTime - this.timeGap) * 0.001);
        }
        this.timeGap -= this.boardBingoTime;
        this.boardCoroutine = null;
        this.connectFourNameTagManager.HideNameTag();
        this.ActivateBoard(true);
    }

    private *BoardFullCoroutine()
    {
        if(this.timeGap < this.boardFullTime)
        {
            yield this.boardFullWait;
        }
        this.timeGap -= this.boardFullTime;
        this.boardCoroutine = null;
        this.ActivateBoard(true);
    }

    // 4목 완성 여부 확인
    CheckBingo(chipColor : ChipColor) : bool
    {
        // 가로
        for (var row = 0; row < this.rowNum; row++)
        {
            for (var col = 0; col < this.colNum - 3; col++)
            {
                // 연속 4개 색이 동일한지 확인 조건
                if (this.localSyncData.chipList[row][col] == chipColor
                    && this.localSyncData.chipList[row][col + 1] == chipColor
                    && this.localSyncData.chipList[row][col + 2] == chipColor
                    && this.localSyncData.chipList[row][col + 3] == chipColor)
                {
                    for (var i = 0; i <= 3; i++)
                    {
                        this.bingoChips[i] = this.chipBoardList[row][col + i];
                    }
                    return true;
                }
            }
        }
        //세로
        for (var row = 0; row < this.rowNum - 3; row++)
        {
            for (var col = 0; col < this.colNum; col++)
            {
                if (this.localSyncData.chipList[row][col] == chipColor
                    && this.localSyncData.chipList[row + 1][col] == chipColor
                    && this.localSyncData.chipList[row + 2][col] == chipColor
                    && this.localSyncData.chipList[row + 3][col] == chipColor)
                {
                    for (var i = 0; i <= 3; i++)
                    {
                        this.bingoChips[i] = this.chipBoardList[row + i][col];
                    }
                    return true;
                }
            }
        }
        // 대각선1
        for (var row = 0; row < this.rowNum - 3; row++)
        {
            for (var col = 0; col < this.colNum - 3; col++)
            {
                if (this.localSyncData.chipList[row][col] == chipColor
                    && this.localSyncData.chipList[row + 1][col + 1] == chipColor
                    && this.localSyncData.chipList[row + 2][col + 2] == chipColor
                    && this.localSyncData.chipList[row + 3][col + 3] == chipColor)
                {
                    for (var i = 0; i <= 3; i++)
                    {
                        this.bingoChips[i] = this.chipBoardList[row + i][col + i];
                    }
                    return true;
                }
            }
        }
        // 대각선2
        for (var row = 0; row < this.rowNum - 3; row++)
        {
            for (var col = this.colNum - 1; col >= 3; col--)
            {
                if (this.localSyncData.chipList[row][col] == chipColor
                    && this.localSyncData.chipList[row + 1][col - 1] == chipColor
                    && this.localSyncData.chipList[row + 2][col - 2] == chipColor
                    && this.localSyncData.chipList[row + 3][col - 3] == chipColor)
                {
                    for (var i = 0; i <= 3; i++)
                    {
                        this.bingoChips[i] = this.chipBoardList[row + i][col - i];
                    }
                    return true;
                }
            }
        }
        return false;
    }

    // 4목 보드가 완전히 찼는지 확인
    CheckBoardFull() : bool
    {
        for(var idx = 0;idx < this.colNum;idx++)
        {
            if(this.localSyncData.chipCounts[idx] < this.rowNum)
            {
                return false;
            }
        }
        return true;
    }

    // 4목 완성 시 호출
    Bingo(nickname : string)
    {
        this.CFLog("Bingo : " + nickname + " Time Gap : " + this.timeGap);
        this.chipCoroutine = this.StartCoroutine(this.ChipBingoCoroutine);
    }

    private *ChipBingoCoroutine()
    {
        if(this.timeGap < this.chipBingoAniLength)
        {
            for(var idx = 0;idx < 4;idx++)
            {
                this.bingoChips[idx].GetComponent<Animator>().SetTrigger("Bingo");
            }

            this.connectFourAudioSource.clip = this.bingoSound;
            this.connectFourAudioSource.Play();

            yield this.chipBingoWait;
        }
        this.timeGap -= this.chipBingoAniLength;
        this.chipCoroutine = null;
        this.currentBoardState = BoardState.Bingo;
        this.DeactivateBoard(true);
    }

    // 미리보기 오브젝트, 터치 유도 UI의 색상 변경
    ChangePreviewAndGuideColor(chipColor : ChipColor)
    {
        if(chipColor == ChipColor.Gold)
        {
            this.chipPreviewRenderer.material.mainTexture = this.chipGold;
            this.touchGuideClickImageList.forEach(element =>
            {
                element.color = this.goldColor;
            });

            for(var idx = 0;idx < this.coneCounts;idx++)
            {
                this.coneRendererList[idx].material.mainTexture = this.coneGold;
            }
        }
        else
        {
            this.chipPreviewRenderer.material.mainTexture = this.chipSilver;
            this.touchGuideClickImageList.forEach(element =>
            {
                element.color = this.silverColor;
            });

            for(var idx = 0;idx < this.coneCounts;idx++)
            {
                this.coneRendererList[idx].material.mainTexture = this.coneSilver;
            }
        }
    }
//#endregion
};