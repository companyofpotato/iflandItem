import { Coroutine, Debug, Input, KeyCode, WaitForSeconds } from 'UnityEngine'
import { MultiPlay, Players } from 'ifland.PropEngine'
import { IFSBehaviour } from 'ifland.ScriptEngine'
import DinoRouletteSyncData from './DinoRouletteSyncData'

export default class DinoRouletteSync extends IFSBehaviour
{
    private localSyncData : DinoRouletteSyncData
    private receivedSyncData : DinoRouletteSyncData = new DinoRouletteSyncData();
    private cachedSyncData : DinoRouletteSyncData = new DinoRouletteSyncData();
    private buttonCount : int
    private cor : Coroutine;

    OnSyncCallback : (syncData : DinoRouletteSyncData, skipable : bool) => void
    OnSyncServerCallback : (syncData : DinoRouletteSyncData) => void

    RouletteLog(str : string)
    {
        Debug.Log(" PIID : " + this.PropInstaceID + " [DinoRoulette] " + str)
    }

    OnApplicationPause(isPause : bool)
    {
        this.RouletteLog("Pause on DinoRouletteSync : " + isPause);

        if(this.cor != null)
        {
            this.RouletteLog("Stop OnSync Coroutine by BG");
            this.StopCoroutine(this.cor);
            this.cor = null;
        }
    }

    Init(num : int)
    {
        this.buttonCount = num

        this.ResetSyncData()
    }

    ResetSyncData()
    {
        this.localSyncData = new DinoRouletteSyncData()
        this.localSyncData.interactTime = 0
        this.localSyncData.pushedNicknameList = new Array<string>(this.buttonCount)
        this.localSyncData.pushedNicknameList.fill("")
        this.localSyncData.winningBottle = -1
        this.localSyncData.lastPushedBottle = -1
        this.localSyncData.lastPushedUserIdx = -1
    }

    SetSyncData(index : int, nickname : string)
    {
        this.localSyncData.interactTime = MultiPlay.Timestamp
        this.localSyncData.pushedNicknameList[index] = nickname
        
        if(this.localSyncData.winningBottle < 0)
        {
            this.localSyncData.winningBottle = this.GetRandomNum(this.buttonCount)
        }

        this.localSyncData.lastPushedBottle = index
        this.localSyncData.lastPushedUserIdx = Players.GetMyUserIdx()
    }

    RevertSyncData()
    {
        this.localSyncData.pushedNicknameList[this.localSyncData.lastPushedBottle] = ""
    }

    SyncReset()
    {
        this.ResetSyncData()
        this.localSyncData.interactTime = MultiPlay.Timestamp
        this.localSyncData.lastPushedUserIdx = Players.GetMyUserIdx()
        this.RouletteLog("SyncReset Try time : " + MultiPlay.Timestamp)
        MultiPlay.Sync(this, this.localSyncData)
        .OnSucceed(() => {
            this.RouletteLog("SyncReset success : " + MultiPlay.Timestamp)
        })
        .OnFailed(() => {
            this.RouletteLog("SyncReset fail : " + MultiPlay.Timestamp)
            
            // JUMPVRM-6464
            // 동기화 실패 시 재시도 로직 삭제
            // this.StartCoroutine(this.RetrySyncCoroutine(1.0))
        })
    }

    // *RetrySyncCoroutine(t : float)
    // {
    //     yield new WaitForSeconds(t)
    //     this.SyncReset()
    // }

    GetRandomNum(max : int)
    {
        max--
        return Math.floor(Math.random() * max)
    }

    Sync(index : int, nickname : string)
    {
        this.SetSyncData(index, nickname)
        this.RouletteLog("Sync Try time : " + MultiPlay.Timestamp)
        MultiPlay.SyncWithAuthority(this, this.localSyncData)
        .OnSucceed(() => {
            this.RouletteLog("Sync success : " + MultiPlay.Timestamp)
            this.ReleaseAuthority()
        })
        .OnFailed(() => {
            this.RouletteLog("Sync fail : " + MultiPlay.Timestamp)
            this.ReleaseAuthority()
            this.RevertSyncData()
        })
        // ReleaseAuthority를 여기가 아닌 성공/실패 콜백에서 호출하는 이유
        // - 콜백 함수가 OnSync가 호출된 후에 호출되기 때문에, 타이밍 상 나중에 권한 해제하는 것이 낫다.
    }

    ReleaseAuthority()
    {
        this.RouletteLog("Release Try time : " + MultiPlay.Timestamp)
        MultiPlay.ReleaseAuthority(this.gameObject)
        .OnSucceed(c => {
            this.RouletteLog("Release Authority success")
        })
        .OnFailed(c => {
            this.RouletteLog("Release Authority fail")
            if(MultiPlay.IsAuthorityResultSuccess(c.result))
            {
                this.RouletteLog("Still have Authority. Retry Release")
                this.StartCoroutine(this.RetryReleaseAuthorityCoroutine(1.0))
            }
        })
    }

    *RetryReleaseAuthorityCoroutine(t : float)
    {
        yield new WaitForSeconds(t)
        this.ReleaseAuthority()
    }

    OnSync(syncData : DinoRouletteSyncData)
    {
        this.RouletteLog("OnSync time : " + MultiPlay.Timestamp)
        if(syncData == null)
        {
            this.RouletteLog("OnSync : no data")
            return
        }

        this.RouletteLog("OnSync winning bottle : " + syncData.winningBottle + ", lastpushed : " + syncData.lastPushedBottle)
        this.localSyncData = JSON.parse(JSON.stringify(syncData))
        this.receivedSyncData = JSON.parse(JSON.stringify(syncData))

        if(this.cor == null)
        {
            this.cachedSyncData = JSON.parse(JSON.stringify(this.receivedSyncData));
            this.cor = this.StartCoroutine(this.OnSyncCoroutine());
        }
        else
        {
            if(this.cachedSyncData != null)
            {
                if(this.receivedSyncData.interactTime <= this.cachedSyncData.interactTime)
                {
                    this.RouletteLog("cache new");
                    this.OnSyncCallback(this.receivedSyncData, true);
                }
                else
                {
                    this.RouletteLog("cache old");
                    this.OnSyncCallback(this.cachedSyncData, true);
                    this.cachedSyncData = JSON.parse(JSON.stringify(this.receivedSyncData));
                }
            }
            else
            {
                this.RouletteLog("cache is empty");
            }
        }
    }

    *OnSyncCoroutine()
    {
        yield null;
        if(this.cachedSyncData != null)
        {
            this.RouletteLog("Call cached onsync");
            this.OnSyncCallback(this.cachedSyncData, false);
        }
        else
        {
            this.RouletteLog("cache is empty in coroutine");
        }
        this.cor = null;
    }

    OnSyncServer(syncData : DinoRouletteSyncData)
    {
        this.RouletteLog("OnSyncServer time : " + MultiPlay.Timestamp)
        if(syncData == null)
        {
            this.RouletteLog("OnSyncServer : no data")
            return
        }
        this.RouletteLog("OnSyncServer winning bottle : " + syncData.winningBottle + ", lastpushed : " + syncData.lastPushedBottle)

        if(this.cor != null)
        {
            this.RouletteLog("Stop OnSync Coroutine by OnSyncServer");
            this.StopCoroutine(this.cor);
            this.cor = null;
        }

        this.localSyncData = JSON.parse(JSON.stringify(syncData))
        this.OnSyncServerCallback(syncData)
    }
};