import PropSettingController from './PropSettingController';
import { Coroutine, Debug, GameObject, Input, KeyCode, Texture, Transform, WaitForSeconds } from 'UnityEngine';
import { ECompareToken, IFSBehaviour } from 'ifland.ScriptEngine'
import Definition from '../Definition';
import SyncController from './SyncController';
import StageController from './StageController';
import { InteractionButtons, Lab, Land, MultiPlay, Players } from 'ifland.PropEngine';
import UIController from './UIController';
import GraphicEffectController from './GraphicEffectController';
import SoundEffectController from './SoundEffectController';
import DownloadController from './DownloadController';
import VolumetricController from './VolumetricController';
import ButtonEventController from './ButtonEventController';
import CameraController from './CameraController';

export default class IFDol extends IFSBehaviour
{
    @Header("Transform")
    public modelingTransform : Transform;
    public endingTransform : Transform;

    private gameObjectList : GameObject[];

    @Header("Controller")
    public propSettingController : PropSettingController;
    public stageController : StageController;
    public syncController : SyncController;
    public uiController : UIController;
    public graphicEffectController : GraphicEffectController;
    public soundEffectController : SoundEffectController;
    public downloadController : DownloadController;
    public volumetricController : VolumetricController
    public buttonEventController : ButtonEventController;
    public cameraController : CameraController;
    
    private myIdx : int;
    private isDownloadDataInitialize : bool;
    private isEndingButtonTextureDownloaded : bool;
    private isStageDataInitialize : bool;
    private initializeCoroutine : Coroutine;
    private isEditMode : bool;
    private isEndingShown : bool;
    private isPlayingLevelUp : bool;

    private IFDolLog(msg : string)
    {
        Debug.Log("[IFDol] " + msg);
    }

//#region LifeCycle 및 on/off
    Awake()
    {
        this.IFDolLog("Awake");
        this.SetTransformList();
        this.Initialize();
    }
    
    OnPropActivate()
    {
        this.IFDolLog("Prop Activate");
    }

    OnPropDeactivate()
    {
        this.IFDolLog("Prop Deactivate");
    }

    OnDecorateModeChanged(isDecorateMode : bool)
    {
        this.IFDolLog("Docorate Mode Changed : " + isDecorateMode);
        if(isDecorateMode)
        {
            this.uiController.HideAllUI();
        }
        else
        {
            this.uiController.ShowAllUI();
        }
    }

    private Initialize()
    {
        this.TurnObjectOnAll();

        this.myIdx = Players.GetMyUserIdx();
        this.initializeCoroutine = null;
        this.isDownloadDataInitialize = false;
        this.isEndingButtonTextureDownloaded = false;
        this.isStageDataInitialize = false;
        // this.isPropSettingInitialize = false;
        this.isEditMode = false;
        this.isPlayingLevelUp = false;

        this.stageController.Initialize(
            (isSuccess : bool) =>
            {
                this.IFDolLog("Get GrowthMeta : " + isSuccess);
                this.isStageDataInitialize = isSuccess;
            }
        );
        this.graphicEffectController.Initialize();
        this.soundEffectController.Initialize();
        this.volumetricController.Initialize(this.stageController.GetStageCount(), this.stageController.GetEndingCount());
        this.syncController.Initialize();
        this.syncController.OnIFDolInfo = this.OnIFDolInfoCallback;
        this.syncController.OnSyncResult = this.OnSyncResultCallback;

        this.uiController.Initialize(this.stageController.GetMaxStage());
        this.buttonEventController.Initialize(this);
        this.downloadController.Initialize(this.stageController.GetStageCount(), (isSuccess : bool) =>
        {
            if(isSuccess)
            {
                this.IFDolLog("GetComponentMeta Success");
                
                this.isDownloadDataInitialize = true;

                this.downloadController.RequestButtonTexture(this.stageController.GetMaxStage(),
                    (isSuccess : bool, result : string, texture : Texture, stage : int) =>
                    {
                        if(isSuccess)
                        {
                            this.IFDolLog("ButtonTexture Download Success " + stage);
                            this.uiController.SetEditButtonTexture(stage, texture);
                        }
                        else
                        {
                            this.IFDolLog("ButtonTexture Download Fail " + stage + " : " + result);
                            return false;
                        }
                    });
            }
            else
            {
                this.IFDolLog("GetComponentMeta is Failed");
            }
        });

        this.TurnObjectOffAll();

        this.gameObjectList[0].SetActive(true);
    }
    
//#endregion

    private SetTransformList()
    {
        let normalCount = this.modelingTransform.childCount - 1;
        let endingCount = this.endingTransform.childCount;

        this.gameObjectList = new Array<GameObject>(normalCount + endingCount);

        for(let idx = 0;idx < normalCount;idx++)
        {
            this.gameObjectList[idx] = this.modelingTransform.GetChild(idx).gameObject;
        }

        for(let idx = 0;idx < endingCount;idx++)
        {
            this.gameObjectList[idx + normalCount] = this.endingTransform.GetChild(idx).gameObject;
        }
    }

    private TurnObjectOnAll()
    {
        this.gameObjectList.forEach(element =>
        {
            element.SetActive(true);    
        });
    }

    private TurnObjectOffAll()
    {
        this.gameObjectList.forEach(element =>
        {
            element.SetActive(false);    
        });
    }

//#region 버튼 이벤트 처리
    Interaction()
    {
        if($CompareVersion("1.2.6", ECompareToken.Equal) || $CompareVersion("1.2.6", ECompareToken.OrLess)) // 나중에 버전 정보 바꿔야 함
        {
            this.IFDolLog("Version is low");
            this.uiController.ShowToast(Definition.ToastCode.Update_App);
            return;
        }

        if(InteractionButtons.IsButtonsVisible == false && this.isEditMode == false)
        {
            this.IFDolLog("Button is not visible");
            return;
        }

        this.IFDolLog("Interaction");

        this.uiController.PlayInteractionGlowEffect();

        let json =
        {
            eventName : "TAP_IFDOL_INTERACTION",
            roomDataNeeded :true,
            parameters : []
        };

        Lab.SendIGFEvent("NTY_LOG_EVENT_AMPLITUDE", JSON.stringify(json), (result : string) => 
        {
            this.IFDolLog("Amplitude log result : " + result);
        });

        let stage = this.stageController.GetCurrentStage();

        this.uiController.DisableInteractionButton();
        this.syncController.RequestInteraction(stage, this.stageController.GetEnding(), this.isEndingShown);
    }

    ChangeStageButton(stage : int) : bool
    {
        if(stage == this.stageController.GetMaxStage())
        {
            stage = this.stageController.GetEnding();
        }

        if(this.uiController.CheckSelectable(stage))
        {
            let json =
            {
                eventName : "TAP_IFDOL_CONTENT_LIST_ITEM",
                roomDataNeeded :true,
                parameters : [
                    {
                        "key":"ITEM_IDX",
                        "value":this.ProductID
                    },
                    {
                        "key":"CONTENT_IDX",
                        "value":stage.toString()
                    }
                ]
            };

            Lab.SendIGFEvent("NTY_LOG_EVENT_AMPLITUDE", JSON.stringify(json), (result : string) => 
            {
                this.IFDolLog("Amplitude log result : " + result);
            });

            this.uiController.ChangeStage(stage);
            
            this.downloadController.RequestVolumetricTexture(stage,
                (isSuccess : bool, result : string, texture : Texture) =>
                {
                    if(isSuccess)
                    {
                        this.volumetricController.ChangeMainVolumetric(stage);
                        if(texture != null)
                        {
                            this.volumetricController.SetVolumetricTexture(stage, texture);
                        }
                        this.uiController.SetButtonPosition(this.volumetricController.GetVolumetricColliderSize());
                        this.uiController.ShowSpeechBubble(stage);
                        this.soundEffectController.PlayContentSound(stage);
                        return true;
                    }
                    else
                    {
                        this.IFDolLog("Volumetric Download Fail : " + result);
                        return false;
                    }
                })
        }
        else
        {
            return false;
        }
    }

    EnterEditMode() : bool
    {
        if($CompareVersion("1.2.6", ECompareToken.Equal) || $CompareVersion("1.2.6", ECompareToken.OrLess)) // 나중에 버전 정보 바꿔야 함
        {
            this.IFDolLog("Version is low");
            this.uiController.ShowToast(Definition.ToastCode.Update_App);
            return false;
        }

        this.syncController.RequestAuthority();

        this.isEditMode = true;
        this.IFDolLog("Enter Edit Mode");
        this.cameraController.EnterEditMode();
        this.uiController.EnterEditMode(this.stageController.GetCurrentStage(), this.stageController.GetUnlockedStage());
        return true;
    }

    ExitEditMode()
    {
        this.syncController.ReleaseAuthority();

        this.isEditMode = false;
        const stage = this.uiController.GetCurrentSelectedStage();
        this.IFDolLog("Exit Edit Mode " + stage);
        this.cameraController.ExitEditMode();
        this.uiController.ExitEditMode();
        if(stage != this.stageController.GetCurrentStage())
        {
            this.syncController.RequestChangeStage(stage, this.stageController.GetEnding(), this.isEndingShown);
        }
    }

    HideEndingScreen()
    {
        this.isEndingShown = true;
        this.uiController.HideEndingScreen();
    }

//#endregion


//#region 데이터 처리

    OnSyncResultCallback(isSuccess : bool)
    {
        this.IFDolLog("Sync Result : " + isSuccess);
        this.uiController.EnableInteractionButton();
        if(isSuccess == false)
        {
            this.uiController.ShowToast(Definition.ToastCode.Error_Common);
        }
    }

    OnIFDolInfoCallback(apiType : int, userIdx : int, score : int, stage : int, ending : int, isEndingShown : bool, action : int)
    {
        this.IFDolLog("Info callback userIdx : " + userIdx + ", score : " + score + ", stage : " + stage + ", ending : " + ending + ", endingShown : " + isEndingShown + ", action : " + action);

        this.uiController.EnableInteractionButton();

        if(this.isDownloadDataInitialize && this.isStageDataInitialize)
        {
            this.ReceiveInfo(apiType, userIdx, score, stage, ending, isEndingShown, action);
        }
        else
        {
            if(this.initializeCoroutine != null)
            {
                this.StopCoroutine(this.initializeCoroutine);
            }
            this.initializeCoroutine = this.StartCoroutine(this.WaitForInitialization(apiType, userIdx, score, stage, ending, isEndingShown, action));
        }
    }

    *WaitForInitialization(apiType : int, userIdx : int, score : int, stage : int, ending : int, isEndingShown : bool, action : int)
    {
        while(this.isDownloadDataInitialize == false || this.isStageDataInitialize == false)
        {
            yield null;
        }
        this.ReceiveInfo(apiType, userIdx, score, stage, ending, isEndingShown, action);
    }

    ReceiveInfo(apiType : int, userIdx : int, score : int, stage : int, ending : int, isEndingShown : bool, action : int)
    {
        this.IFDolLog("ReceiveInfo");
        
        if(this.stageController.GetEnding() < 0)
        {
            if(ending < 0)
            {
                ending = this.stageController.GetRandomEnding();
                isEndingShown = false;
            }

            this.stageController.SetEnding(ending);
            this.isEndingShown = isEndingShown;
            this.IFDolLog("Set Ending : " + ending);
        }

        if(this.isEndingButtonTextureDownloaded == false)
        {
            this.downloadController.RequestEndingButtonTexture(this.stageController.GetEnding(),
                (isSuccess : bool, result : string, texture : Texture, stage : int) =>
                {
                    if(isSuccess)
                    {
                        this.IFDolLog("ButtonTextureEnding Download Success " + stage);
                        this.uiController.SetEndingButtonTexture(texture);
                        this.isEndingButtonTextureDownloaded = true;
                    }
                    else
                    {
                        this.IFDolLog("ButtonTextureEnding Download Fail " + stage + " : " + result);
                        return false;
                    }
                }
            );
        }

        this.initializeCoroutine = null;

        this.uiController.ForceUpdate();
        this.uiController.SetButtonPosition(this.volumetricController.GetVolumetricColliderSize());

        if(userIdx < 0 || userIdx == null || userIdx == undefined)
        {
            userIdx = Land.ifHomeID;
        }

        this.stageController.ReceiveInfo(score, stage, action, this.isEndingShown,
            (isStageChanged : bool, stageNum : int, maxUnlockedStage : int, isLevelUp : bool, isInitialization : bool, isUnlockEnding : bool) => 
            {
                this.IFDolLog("Info after score : " + score + ", isStageChange : " + isStageChanged + ", stage : " + stageNum + ", maxUnlockedStage : " + maxUnlockedStage + ", isLevelUp : " + isLevelUp + ", isInit : " + isInitialization + ", isUnlockEnding : " + isUnlockEnding);

                if(isLevelUp || isInitialization)
                {
                    this.stageController.SetUnlockedStage(maxUnlockedStage);
                }
                
                if(isStageChanged)
                {
                    this.stageController.SetCurrentStage(stageNum);
                }

                if(this.isEndingShown)
                {
                    this.uiController.HideEndingScreen();
                }

                if(isStageChanged)
                {
                    this.StartCoroutine(this.ContentChangeCoroutine(apiType, userIdx, stage, stageNum, isLevelUp, isInitialization, isUnlockEnding));
                }
                else
                {
                    this.PlayInteraction(apiType, userIdx, stageNum);
                }
            });
    }

    private PlayInteraction(apiType : int, userIdx : int, stageNum : int)
    {
        let unlockedStage = this.stageController.GetUnlockedStage();
        this.uiController.SetInteractionUIData(this.stageController.GetScore(), this.stageController.GetUnlockScore(unlockedStage + 1), this.stageController.GetUnlockScore(unlockedStage), unlockedStage);

        if(this.isEditMode)
        {
            stageNum = this.uiController.GetCurrentSelectedStage();
        }

        if(apiType == MultiPlay.GrowthApiType.OnGrowthInteractNty && userIdx == this.myIdx && this.isPlayingLevelUp == false)
        {
            this.soundEffectController.PlayInteractionSound(stageNum);
            this.graphicEffectController.PlayInteractionGraphic(stageNum);
            this.soundEffectController.PlayContentSound(stageNum);
        }
    }

    private *ContentChangeCoroutine(apiType : int, userIdx : int, currentStage : int, stageNum : int, isLevelUp : bool, isInitialization : bool, isUnlockEnding : bool)
    {
        this.isPlayingLevelUp = isLevelUp;

        if(apiType != MultiPlay.GrowthApiType.OnGrowthBaseInfoChangeBr && apiType != MultiPlay.GrowthApiType.OnSnapshop)
        {
            if(isLevelUp && userIdx == this.myIdx)
            {
                this.soundEffectController.PlayInteractionSound(currentStage);
                this.graphicEffectController.PlayInteractionGraphic(currentStage);
        
                yield new WaitForSeconds(this.graphicEffectController.GetInteracdtionGraphicTime(currentStage));
            }
        }

        this.downloadController.RequestVolumetricTexture(stageNum,
            (isSuccess : bool, result : string, texture : Texture) =>
            {
                if(isSuccess)
                {
                    this.IFDolLog("Texture Download Success : " + stageNum);
                    if(texture != null)
                    {
                        this.volumetricController.SetVolumetricTexture(stageNum, texture);
                    }
                    this.volumetricController.ChangeMainVolumetric(stageNum);

                    if(apiType != MultiPlay.GrowthApiType.OnGrowthBaseInfoChangeBr && apiType != MultiPlay.GrowthApiType.OnSnapshop && isLevelUp)
                    {
                        this.graphicEffectController.PlayContentGraphic(stageNum);
                        this.soundEffectController.PlayLevelupSound(stageNum);
                    }

                    this.uiController.SetButtonPosition(this.volumetricController.GetVolumetricColliderSize());
                    this.uiController.ShowSpeechBubble(stageNum);

                    if(apiType == MultiPlay.GrowthApiType.OnGrowthBaseInfoChangeBr)
                    {
                        if(isInitialization)
                        {
                            this.soundEffectController.PlayContentSound(stageNum);
                        }
                    }
                    else if(apiType == MultiPlay.GrowthApiType.OnGrowthAdditionalDataChangeNty)
                    {
                        this.soundEffectController.PlayContentSound(stageNum);
                    }
                    else if(apiType == MultiPlay.GrowthApiType.OnGrowthInteractNty)
                    {
                        this.StartCoroutine(this.ContentSoundCoroutine(stageNum));
                    }
                    
                    let unlockedStage = this.stageController.GetUnlockedStage();

                    if(isUnlockEnding)
                    {
                        if(userIdx == this.myIdx)
                        {
                            if(isInitialization)
                            {
                                this.isEndingShown = true;
                                this.uiController.HideEndingScreen();
                            }
                            else if(!this.isEndingShown)
                            {
                                this.uiController.ShowEndingScreen();
                            }
                        }
                        else
                        {
                            this.isEndingShown = true;
                            this.uiController.HideEndingScreen();
                        }
                    }
                    else
                    {
                        this.uiController.SetInteractionUIData(this.stageController.GetScore(), this.stageController.GetUnlockScore(unlockedStage + 1), this.stageController.GetUnlockScore(unlockedStage), unlockedStage);
                    }

                    this.uiController.ChangeUnlockedStage(unlockedStage);
                    this.uiController.ChangeStage(stageNum); 
                }
                else
                {
                    this.IFDolLog("Volumetric Download Fail : " + result);
                }
                this.isPlayingLevelUp = false;
            }
        );

        let nextStage = stageNum + 1;
        this.downloadController.RequestVolumetricTexture(nextStage,
            (isSuccess : bool, result : string, texture : Texture) =>
            {
                if(isSuccess)
                {
                    this.IFDolLog("Texture Download Success : " + nextStage);
                    if(texture != null)
                    {
                        this.volumetricController.SetVolumetricTexture(nextStage, texture);
                    }
                }
                else
                {
                    this.IFDolLog("Volumetric Download Fail : " + result);
                }
            }
        );
    }

    private *ContentSoundCoroutine(stage : int)
    {
        yield new WaitForSeconds(this.graphicEffectController.GetAnimationTime(stage));

        this.soundEffectController.PlayContentSound(stage);
    }

//#endregion
};