import { Debug, Random } from 'UnityEngine';
import StageData from '../Model/StageData'
import { IFSBehaviour } from 'ifland.ScriptEngine'
import { Players } from 'ifland.PropEngine';
import Definition from '../Definition';

export default class StageController extends IFSBehaviour
{
    public stageData : StageData;

    // private unlockEnding : bool;

    private IFDolLog(msg : string)
    {
        Debug.Log("[IFDol] " + msg);
    }

    public Initialize(OnResult : (isSuccess : bool) => void)
    {
        // this.unlockEnding = false;
        this.stageData.Initialize(OnResult);
    }

    public ReceiveInfo(score : int, stage : int, action : int, isEndingShown : bool, OnResult : (isStageChanged : bool, stageNum : int, maxUnlockedStage : int, isLevelUp : bool, isInitialization : bool, isUnlockEnding : bool) => void)
    {
        if(score < 0 || stage < 0)
        {
            this.IFDolLog("score( " + score + " ) or stage( " + stage + " ) is minus");
            return;
        }

        const currentStage = this.stageData.GetCurrentStage();
        const currentScore = this.stageData.GetScore();
        const currentUnlockedStage = this.stageData.GetUnlockedStage();
        let isInit = false; // apitype 판단으로 교체 가능한지 검토 필요. BG/FG 전환은 이프홈 입장과 달리 true로 나오겠지만, 실제 동작은 같지 않을까...

        this.IFDolLog("Current Stage : " + currentStage + ", Score : " + currentScore + ", UnlockedStage : " + currentUnlockedStage);

        if(currentScore > score)
        {
            this.IFDolLog("Score is lower than Current Score");
            return;
        }

        if(currentUnlockedStage < 0)
        {
            this.IFDolLog("Data Initialization");
            isInit = true;
        }

        const maxStage = this.stageData.GetMaxStage();
        let unlockStage = 0;
        
        for(let idx = 1;idx <= maxStage ;idx++) // 0번 단계(1단계) 해금 점수는 0이므로 1번 단계(2단계) 해금 점수부터 확인한다.
        {
            if(score < this.stageData.GetUnlockScore(idx))
            {
                unlockStage = idx - 1;
                break;
            }
            else if(idx == maxStage)
            {
                unlockStage = this.stageData.GetEnding();
            }
        }

        this.SetScore(score);

        switch(action)
        {
            case Definition.ActionType.ChangeStage :
                if(unlockStage >= maxStage)
                {
                    if(isEndingShown)
                    {
                        OnResult(true, stage, unlockStage, false, isInit, false);
                    }
                    else
                    {
                        OnResult(true, stage, maxStage - 1, false, isInit, false);
                    }
                }
                else
                {
                    OnResult(true, stage, unlockStage, false, isInit, false);
                }
                break;
            case Definition.ActionType.NormalInteraction :
                if(unlockStage >= maxStage)
                {
                    // 엔딩 점수 도달이므로 참여자 인터랙션은 무조건 일반 인터랙션
                    if(isEndingShown)
                    {
                        OnResult(isInit, stage, unlockStage, false, isInit, false);
                    }
                    else
                    {
                        OnResult(isInit, stage, maxStage - 1, false, isInit, false);
                    }
                }
                else
                {
                    if(isInit)
                    {
                        if(score - 5 < this.stageData.GetUnlockScore(unlockStage))
                        {
                            // 레벨업 인터랙션 초기화
                            OnResult(true, unlockStage, unlockStage, false, true, false);
                        }
                        else
                        {
                            // 일반 인터랙션 초기화
                            OnResult(true, stage, unlockStage, false, true, false);
                        }
                    }
                    else
                    {
                        if(currentUnlockedStage < unlockStage)
                        {
                            // 레벨업 인터랙션
                            OnResult(true, unlockStage, unlockStage, true, false, false);
                        }
                        else if(currentUnlockedStage == unlockStage)
                        {
                            // 일반 인터랙션
                            OnResult(false, stage, unlockStage, false, false, false);
                        }
                        else
                        {
                            this.IFDolLog("Unlocked Stage is lower than Current Stage");
                        }
                    }
                }
                break;
            case Definition.ActionType.HostInteraction :
                if(unlockStage >= maxStage)
                {
                    if(isEndingShown)
                    {
                        // 엔딩 해금 후 일반 인터랙션
                        OnResult(isInit, stage, unlockStage, false, isInit, true);
                    }
                    else
                    {
                        // 엔딩 해금 인터랙션
                        OnResult(true, unlockStage, unlockStage, !isInit, isInit, true);
                    }
                }
                else
                {
                    if(isInit)
                    {
                        if(score - 1 < this.stageData.GetUnlockScore(unlockStage))
                        {
                            // 레벨업 인터랙션 초기화
                            OnResult(true, unlockStage, unlockStage, false, true, false);
                        }
                        else
                        {
                            // 일반 인터랙션 초기화
                            OnResult(true, stage, unlockStage, false, true, false);
                        }
                    }
                    else
                    {
                        if(currentUnlockedStage < unlockStage)
                        {
                            // 레벨업 인터랙션
                            OnResult(true, unlockStage, unlockStage, true, false, false);
                        }
                        else if(currentUnlockedStage == unlockStage)
                        {
                            // 일반 인터랙션
                            OnResult(false, stage, unlockStage, false, false, false);
                        }
                        else
                        {
                            this.IFDolLog("Unlocked Stage is lower than Current Stage");
                        }
                    }
                }
                break;
        }
    }

    public SetEnding(ending : int)
    {
        this.stageData.SetEnding(ending);
    }

    public GetEnding() : int
    {
        return this.stageData.GetEnding();
    }

    public SetCurrentStage(stage : int)
    {
        this.stageData.SetCurrentStage(stage);
    }

    public GetCurrentStage() : int
    {
        return this.stageData.GetCurrentStage();
    }

    public SetUnlockedStage(stage : int)
    {
        this.stageData.SetUnlockedStage(stage);
    }

    public GetUnlockedStage() : int
    {
        return this.stageData.GetUnlockedStage();
    }

    public GetMaxStage() : int
    {
        return this.stageData.GetMaxStage();
    }

    public SetScore(score : int)
    {
        this.stageData.SetScore(score);
    }

    public GetScore() : int
    {
        return this.stageData.GetScore();
    }

    public GetRandomEnding() : int
    {
        return Math.floor(Math.random() * this.stageData.GetEndingCount()) + this.stageData.GetMaxStage();
    }

    public GetUnlockScore(stage : int) : int
    {
        return this.stageData.GetUnlockScore(stage);
    }

    public GetStageCount() : int
    {
        return this.stageData.GetStageCount();
    }

    public GetEndingCount() : int
    {
        return this.stageData.GetEndingCount();
    }

    // public CheckUnlockEnding() : bool
    // {
    //     return this.unlockEnding;
    // }
};