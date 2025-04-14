import { PropDescriptor } from 'ifland.PropEngine';
import { IFSBehaviour } from 'ifland.ScriptEngine'
import { Debug, GameObject } from 'UnityEngine';

export default class StageData extends IFSBehaviour
{
    public propDescriptor : PropDescriptor;
    public modelingObject : GameObject;
    public endingObject : GameObject;

    @SerializeField()
    private unlockScore : int[];

    private endingCount : int;
    private stageCount : int;
    private currentStage : int;
    private unlockedStage : int;
    private ending : int; // 엔딩 번호는 기본 애들 다음 번호들로 생각
    //ex. 최대 4단계에 엔딩이 4개일 경우 0, 1, 2는 단계 정보 3, 4, 5, 6은 엔딩 정보
    private score : int;

    public Initialize(OnResult : (isSuccess : bool) => void)
    {
        this.currentStage = 0;
        this.unlockedStage = -1;
        this.ending = -1;
        this.score = 0;

        Debug.Log("[IFDol] use levelmeta");

        this.endingCount = this.endingObject.transform.childCount;
        this.stageCount = this.modelingObject.transform.childCount - 1 + this.endingCount;
            
        this.StartCoroutine(this.WaitForLevelMeta(OnResult));
        // OnResult(true);
    }

    *WaitForLevelMeta(OnResult : (isSuccess : bool) => void)
    {
        let metaData = this.propDescriptor.GrowthMetaInfo;
        while(metaData == null)
        {
            metaData = this.propDescriptor.GrowthMetaInfo;
            yield null;
        }

        if(metaData.isValid)
        {
            this.unlockScore = new Array<int>(metaData.levelMetas.length);
            const scoreCount = this.unlockScore.length;
            for(let idx = 0;idx < scoreCount;idx++)
            {
                this.unlockScore[idx] = metaData.levelMetas[idx].levelScore;
                Debug.Log("[IFDol] level " + idx + " score " + this.unlockScore[idx]);
            }

            OnResult(true);
        }
        else
        {
            Debug.Log("[IFDol] MetaData is Invalid");
            OnResult(false);
        }
    }

//#region GET
    public GetUnlockScore(stage : int) : int
    {
        if(stage > this.GetMaxStage())
        {
            return this.unlockScore[this.GetMaxStage()];
        }
        return this.unlockScore[stage];
    }

    public GetMaxStage() : int
    {
        return this.stageCount - this.endingCount;
    }

    public GetEndingCount() : int
    {
        return this.endingCount;
    }

    public GetCurrentStage() : int
    {
        return this.currentStage;
    }

    public GetUnlockedStage() : int
    {
        return this.unlockedStage;
    }

    public GetEnding() : int
    {
        return this.ending;
    }

    public GetScore() : int
    {
        return this.score;
    }

    public GetStageCount() : int
    {
        return this.stageCount;
    }

//#endregion

//#region SET
    public SetEnding(value : int)
    {
        this.ending = value;
    }

    public SetCurrentStage(value : int)
    {
        this.currentStage = value;
    }

    public SetUnlockedStage(value : int)
    {
        this.unlockedStage = value;
    }

    public SetScore(value : int)
    {
        this.score = value;
    }
//#endregion

};