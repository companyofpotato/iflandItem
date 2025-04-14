import SyncData from './SyncData';
import { MultiPlay, Players, PropDescriptor } from 'ifland.PropEngine'
import { ECompareToken, IFSBehaviour } from 'ifland.ScriptEngine'
import { Debug, WaitForSeconds } from 'UnityEngine';

export default class SyncController extends IFSBehaviour
{
    OnIFDolInfo : (apiType : int, userIdx : int, score : int, stage : int, ending : int, isEndingShown : bool, action : int) => void;
    OnSyncResult : (isSuccess : bool) => void;
    public testAPI : int;
    public testScore : int;
    public testStage : int;
    public testEnding : int;
    public testEndingShown : bool;
    public testAction : int;
    public propDescriptor : PropDescriptor;

    private currentInteractionCount : int;

    public Initialize()
    {
        if($CompareVersion("1.2.6", ECompareToken.Equal) || $CompareVersion("1.2.6", ECompareToken.OrLess))
        {
            Debug.Log("[IFDol] version is too low to use OnGrowthDataChanged");
        }
        else
        {
            this.propDescriptor.OnGrowthDataChanged.AddListener(this.OnGrowthDataChanged);
        }
        this.currentInteractionCount = 0;
    }

    // public Sync(score : int, stage : int)
    // {
    //     // 임시로 MultiPlay.Sync 사용
    //     let syncData = new SyncData();

    //     syncData.userIdx = Players.GetMyUserIdx();
    //     syncData.score = score;
    //     syncData.stage = stage;

    //     MultiPlay.Sync(this, syncData)
    //     .OnSucceed(() => {this.OnSyncResult(true)})
    //     .OnFailed(() => {this.OnSyncResult(false)})
    // }

    public RequestInteraction(currentStage : int, ending : int, isEndingShown : bool)
    {
        let action = -1;
        if(Players.GetMyPlayer().IsMaster)
        {
            this.currentInteractionCount += 1;
            action = 2;
        }
        else
        {
            this.currentInteractionCount += 5;
            action = 1;
        }

        let json = this.MakeJSON(currentStage, action, ending, isEndingShown);

        // this.StartCoroutine(this.AckCoroutine(MultiPlay.GrowthApiType.OnGrowthInteractNty, this.currentInteractionCount, currentStage, ending, isEndingShown, action));

        MultiPlay.RequestGrowthInteraction(this, JSON.stringify(json))
        .OnSucceed(() => {
            Debug.Log("[IFDol] interaction success");
            this.OnSyncResult(true);
        })
        .OnFailed(() => {
            Debug.Log("[IFDol] interaction fail");
            this.OnSyncResult(false);
        })
    }

    public RequestChangeStage(stage : int, ending : int, isEndingShown : bool)
    {
        let json = this.MakeJSON(stage, 0, ending, isEndingShown);

        // this.StartCoroutine(this.AckCoroutine(MultiPlay.GrowthApiType.OnGrowthAdditionalDataChangeNty, this.currentInteractionCount, stage, ending, isEndingShown, 0));
        
        MultiPlay.RequestGrowthAdditionalDataChange(this, JSON.stringify(json))
        .OnSucceed(() => {
            Debug.Log("[IFDol] change success");
        })
        .OnFailed(() => {
            Debug.Log("[IFDol] change fail");
        })
    }

    private MakeJSON(stage : int, action : int, endingValue : int, isEndingShownValue : bool)
    {
        let result = 
        {
            levelIdx : stage,
            actionIdx : action,
            ending : endingValue,
            isEndingShown : isEndingShownValue,
            userIdx : Players.GetMyUserIdx()
        }
        return result;
    }

    private *AckCoroutine(apiType : int, score : int, stage : int, ending : int, isEndingShown : bool, action : int)
    {
        yield new WaitForSeconds(0.2);
        
        this.OnIFDolInfo(apiType, Players.GetMyUserIdx(), score, stage, ending, isEndingShown, action);
        this.OnSyncResult(true)
    }

    private OnGrowthDataChanged(growthInfo : MultiPlay.CommonGrowthInfo)
    {
        Debug.Log("[IFDol] OnGrowthDataChanged : " + growthInfo.propInstanceId);
        if(growthInfo.propInstanceId == this.PropInstaceID && growthInfo.productId == this.ProductID)
        {
            let data = JSON.parse(growthInfo.additionalData);
            this.currentInteractionCount = Number(growthInfo.totalInteractCount)
            if(data.ending == undefined || data.ending == null)
            {
                this.OnIFDolInfo(growthInfo.apiType, data.userIdx, Number(growthInfo.totalInteractCount), data.pose_idx, -1, false, 0);
            }
            else
            {
                this.OnIFDolInfo(growthInfo.apiType, data.userIdx, Number(growthInfo.totalInteractCount), data.levelIdx, data.ending, data.isEndingShown, data.actionIdx);
            }
        }
    }

    public RequestAuthority()
    {
        MultiPlay.RequestAuthority(this.gameObject)
        .OnSucceed(() => {
            Debug.Log("[IFDol] request success");
        })
        .OnFailed(c => {
            Debug.Log("[IFDol] request fail : " + c.result);
        })
    }

    public ReleaseAuthority()
    {
        MultiPlay.ReleaseAuthority(this.gameObject)
        .OnSucceed(() => {
            Debug.Log("[IFDol] release success");
        })
        .OnFailed(c => {
            Debug.Log("[IFDol] release fail : " + c.result);
        })
    }

    // OnSync(data : SyncData)
    // {
    //     this.OnIFDolInfo(data.userIdx, data.score, data.stage);
    // }

    // OnSyncServer(data : SyncData)
    // {
    //     if(data == null)
    //     {
    //         this.currentInteractionCount = this.testScore;
    //         this.OnIFDolInfo(this.testAPI, Players.GetMyUserIdx(), this.testScore, this.testStage, this.testEnding, this.testEndingShown, this.testAction);
    //         return;
    //     }
    // }
};