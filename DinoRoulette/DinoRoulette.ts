import { Debug, GameObject, WaitForSeconds, Material, Coroutine } from 'UnityEngine'
import { MultiPlay, Players } from 'ifland.PropEngine'
import { Image } from 'UnityEngine.UI'
import { IFSBehaviour } from 'ifland.ScriptEngine'
import DinoRouletteSync from './DinoRouletteSync'
import DinoRouletteSyncData from './DinoRouletteSyncData'
import DinoRouletteBottlesManager from './DinoRouletteBottlesManager'
import DinoRouletteDinoReaction from './DinoRouletteDinoReaction'
import DinoRouletteNameTagCreater from './DinoRouletteNameTagCreater'

export default class DinoRoulette extends IFSBehaviour
{
    renderMaterials : Material[]
    particleMaterials : Material[]
    emoticonMaterial : Material
    imageMaterial : Material

    private bottleCount : int
    private emptyNicknameList : Array<string>
    @SerializeField()
    private meshRenderQueue : int = 3055
    private imageParticleRenderQueue : int = 3100

    private shakeTotalAniLength : int
    private fireTotalAniLength : int

    private notwinCoroutine : Coroutine
    private winCoroutine : Coroutine
    private buttonActiveDelay : int = 200

    private activated : bool

    private hideCount : int

    dinoRouletteSync : DinoRouletteSync
    dinoRouletteBottlesManager : DinoRouletteBottlesManager
    dinoRouletteDinoReaction : DinoRouletteDinoReaction
    dinoRouletteNameTagCreater : DinoRouletteNameTagCreater

    RouletteLog(str : string)
    {
        Debug.Log(" PIID : " + this.PropInstaceID + " [DinoRoulette] " + str) 
    }

    RouletteErrorLog(str : string)
    {
        Debug.LogError(" PIID : " + this.PropInstaceID + " [DinoRoulette] " + str)
    }

    OnApplicationPause(isPause : bool)
    {
        this.RouletteLog("Pause : " + isPause)
        if(isPause)
        {
            this.dinoRouletteSync.ReleaseAuthority()
            if(this.notwinCoroutine != null)
            {
                this.StopCoroutine(this.notwinCoroutine)
                this.notwinCoroutine = null
            }
            if(this.winCoroutine != null)
            {
                this.StopCoroutine(this.winCoroutine)
                this.winCoroutine = null
            }
        }
        this.hideCount = 0;
    }

    Awake()
    {
        this.Init()
        this.SetRenderQueue()
    }

    SetRenderQueue()
    {
        this.RouletteLog("Edit RenderQueue")
        var idx = 0
        var count = this.renderMaterials.length
        for(idx = 0;idx < count;idx++)
        {
            this.renderMaterials[idx].renderQueue = this.meshRenderQueue
        }

        count = this.particleMaterials.length
        for(idx = 0;idx < count;idx++)
        {
            this.particleMaterials[idx].renderQueue = this.imageParticleRenderQueue + 1
        }

        this.imageMaterial.renderQueue = this.imageParticleRenderQueue
        this.emoticonMaterial.renderQueue = this.imageParticleRenderQueue + 2;
        
    }

    Init()
    {
        this.activated = true

        if(this.dinoRouletteNameTagCreater == null)
            this.dinoRouletteNameTagCreater = this.gameObject.GetComponent<DinoRouletteNameTagCreater>()
        if(this.dinoRouletteNameTagCreater != null)
        {
            this.dinoRouletteNameTagCreater.Init()
        }
        else
        {
            this.RouletteErrorLog("No DinoRouletteNameTagCreater")
            return;
        }

        var nameTag = this.dinoRouletteNameTagCreater.GetNameTagObject();
        if(nameTag == null)
        {
            this.RouletteErrorLog("No NameTagObject");
        }

        var backgroundMaterial = this.dinoRouletteNameTagCreater.GetBackgroundMaterial();
        if(backgroundMaterial == null)
        {
            this.RouletteErrorLog("No BackgroundMaterial");
        }

        if(this.dinoRouletteBottlesManager == null)
            this.dinoRouletteBottlesManager = this.gameObject.GetComponentInChildren<DinoRouletteBottlesManager>()
        if(this.dinoRouletteBottlesManager != null)
        {
            this.dinoRouletteBottlesManager.Init(nameTag, backgroundMaterial);
            this.dinoRouletteBottlesManager.BottleAnimEndCallback = this.BottleAnimEndCallback
            this.dinoRouletteBottlesManager.BottleButtonClickedCallBack = this.BottleButtonClickedCallBack
            this.bottleCount = this.dinoRouletteBottlesManager.bottleCount;
        }
        else
            this.RouletteErrorLog("No DinoRouletteBottlesManager")

        if(this.dinoRouletteSync == null)
            this.dinoRouletteSync = this.gameObject.GetComponent<DinoRouletteSync>()
        if(this.dinoRouletteSync != null)
        {
            this.dinoRouletteSync.Init(this.bottleCount)
            this.dinoRouletteSync.OnSyncCallback = this.OnSyncCallback
            this.dinoRouletteSync.OnSyncServerCallback = this.OnSyncServerCallback
        }
        else
            this.RouletteErrorLog("No DinoRouletteSync")
        
        if(this.dinoRouletteDinoReaction == null)
            this.dinoRouletteDinoReaction = this.gameObject.GetComponent<DinoRouletteDinoReaction>()
        if(this.dinoRouletteDinoReaction != null)
        {
            this.dinoRouletteDinoReaction.Init(nameTag, backgroundMaterial);
            this.dinoRouletteDinoReaction.ShakeAnimEndCallback = this.ShakeAnimEndCallback
            this.dinoRouletteDinoReaction.FireAnimEndCallback = this.FireAnimEndCallback
        }
        else
            this.RouletteErrorLog("No DinoRouletteDinoReaction")

        this.shakeTotalAniLength = this.dinoRouletteBottlesManager.bottleAnimLength_ms + this.dinoRouletteDinoReaction.shakeAnimLength_ms
        this.fireTotalAniLength = this.dinoRouletteBottlesManager.bottleAnimLength_ms + this.dinoRouletteDinoReaction.fireAnimLength_ms

        this.hideCount = 0;
        this.emptyNicknameList = new Array<string>(this.bottleCount)
        this.emptyNicknameList.fill("")
    }

    BottleButtonClickedCallBack(index : int, nickname : string)
    {
        this.dinoRouletteSync.Sync(index, nickname);
    }

    OnSyncCallback(syncData : DinoRouletteSyncData, skipable : bool)
    {
        if(this.activated == false)
            return
        syncData.lastPushedUserIdx = syncData.lastPushedUserIdx

        var localTime = MultiPlay.Timestamp

        this.RouletteLog("Servertime in Sync : " + syncData.interactTime)
        this.RouletteLog("localtime in Sync : " + localTime)

        var timeGap = 0;
        this.hideCount++;
        this.RouletteLog("hideCount : " + this.hideCount);
        this.dinoRouletteBottlesManager.HideAllButton();

        if(skipable || syncData.lastPushedBottle == syncData.winningBottle || syncData.lastPushedBottle < 0)
        {
            this.RouletteLog("Skipable");
            timeGap = localTime - syncData.interactTime;
        }

        this.RouletteLog("OnSync Time Gap : " + timeGap)

        if(syncData.lastPushedBottle < 0)
        {
            if(timeGap > this.dinoRouletteDinoReaction.resetAnimLength_ms)
            {
                this.ResetRoulette(false, null)
            }
            else
            {
                this.ResetRoulette(true, null)
            }
        }
        else if(syncData.lastPushedBottle == syncData.winningBottle)
        {
            this.RouletteLog("Win");
            if(timeGap > this.fireTotalAniLength)
            {
                timeGap -= this.fireTotalAniLength
                if(timeGap > this.dinoRouletteDinoReaction.resetAnimLength_ms)
                    this.ResetRoulette(false, null)
                else
                    this.ResetRoulette(true, null)
            }
            else
            {
                this.dinoRouletteBottlesManager.AddBottle(syncData, timeGap)
            }
        }
        else
        {
            this.dinoRouletteBottlesManager.AddBottle(syncData, timeGap)
        }
    }

    OnSyncServerCallback(syncData : DinoRouletteSyncData)
    {
        if(this.activated == false)
            return
        this.ResetAll()
        
        var localTime = MultiPlay.Timestamp

        this.RouletteLog("Servertime in SyncServer : " + syncData.interactTime)
        this.RouletteLog("localtime in SyncServer : " + localTime)

        var timeGap = localTime - syncData.interactTime

        this.RouletteLog("OnSyncServer Time Gap : " + timeGap)

        if(syncData.lastPushedBottle < 0)
        {
            if(timeGap > this.dinoRouletteDinoReaction.resetAnimLength_ms)
                this.ResetRoulette(false, null)
            else
                this.ResetRoulette(true, null)
        }
        else
        {
            if(syncData.lastPushedBottle != syncData.winningBottle)
            {
                if(timeGap > this.shakeTotalAniLength)
                {
                    this.dinoRouletteBottlesManager.SetBottles(syncData.pushedNicknameList, -1)
                    this.dinoRouletteBottlesManager.SetButtons(syncData.pushedNicknameList)
                }
                else
                {
                    this.dinoRouletteBottlesManager.SetBottles(syncData.pushedNicknameList, syncData.lastPushedBottle)
                    this.hideCount++;
                    this.dinoRouletteBottlesManager.HideAllButton()
                    this.dinoRouletteBottlesManager.AddBottle(syncData, timeGap)
                }
            }
            else
            {
                if(timeGap > this.fireTotalAniLength)
                {
                    timeGap -= this.fireTotalAniLength
                    if(timeGap > this.dinoRouletteDinoReaction.resetAnimLength_ms)
                        this.ResetRoulette(false, null)
                    else
                        this.ResetRoulette(true, null)
                }
                else
                {
                    this.dinoRouletteBottlesManager.SetBottles(syncData.pushedNicknameList, syncData.lastPushedBottle)
                    this.hideCount++;
                    this.dinoRouletteBottlesManager.HideAllButton()
                    this.dinoRouletteBottlesManager.AddBottle(syncData, timeGap)
                }
            }
        }
    }

    BottleAnimEndCallback(syncData : DinoRouletteSyncData, timeGap : number)
    {
        this.RouletteLog("Bottle Anim End " + syncData.lastPushedBottle)
        if(this.activated == false)
            return
        var isWin = syncData.lastPushedBottle == syncData.winningBottle
        
        timeGap -= this.dinoRouletteBottlesManager.bottleAnimLength_ms

        this.RouletteLog("TimeGap of After Bottle : " + timeGap)

        if(timeGap < 0)
            timeGap = 0

        if(isWin)
        {
            this.winCoroutine = this.StartCoroutine(this.FireSetButtonsCoroutine(syncData, timeGap))
            this.dinoRouletteDinoReaction.PlayWin(timeGap, syncData.lastPushedUserIdx, syncData.pushedNicknameList[syncData.lastPushedBottle])
        }
        else
        {
            this.notwinCoroutine = this.StartCoroutine(this.ShakeSetButtonsCoroutine(syncData, timeGap))
            this.dinoRouletteDinoReaction.PlayNotWin(timeGap, syncData.lastPushedUserIdx)
        }
    }

    ShakeAnimEndCallback()
    {
        this.RouletteLog("Shake Anim End")
    }

    *ShakeSetButtonsCoroutine(syncData : DinoRouletteSyncData, gap : number)
    {
        var waitTime = this.dinoRouletteDinoReaction.shakeAnimLength_ms - gap;

        this.RouletteLog("Shake Button Gap : " + waitTime)

        if(waitTime > 0)
        {
            this.RouletteLog("Wait for " + waitTime + " ms before set buttons")
            waitTime /= 1000
            yield new WaitForSeconds(waitTime)
        }
        this.RouletteLog("Button Active Time : " + MultiPlay.Timestamp)
        this.hideCount--;
        this.RouletteLog("hideCount : " + this.hideCount);
        if(this.hideCount <= 0)
        {
            this.hideCount = 0;
            this.dinoRouletteBottlesManager.SetButtons(syncData.pushedNicknameList)
        }
        this.notwinCoroutine = null;
    }

    FireAnimEndCallback()
    {
        this.RouletteLog("Fire Anim End")
    }

    *FireSetButtonsCoroutine(syncData : DinoRouletteSyncData, gap : number)
    {        
        var waitTime = this.dinoRouletteDinoReaction.fireAnimLength_ms - gap;

        this.RouletteLog("Fire Button Gap : " + waitTime)

        if(waitTime > 0)
        {
            this.RouletteLog("Wait for " + waitTime + " ms before set buttons")
            waitTime /= 1000
            yield new WaitForSeconds(waitTime)
            this.ResetRoulette(true, null)
        }
        else
        {
            this.ResetRoulette(false, null)
        }
        this.winCoroutine = null;
    }

    ResetRoulette(effect : bool, nicknameList : Array<string>)
    {
        if(nicknameList == null)
        {
            nicknameList = this.emptyNicknameList;
        }
        this.RouletteLog("Reset Roulette : " + effect)
        this.dinoRouletteSync.ResetSyncData()
        this.dinoRouletteBottlesManager.SetBottles(nicknameList, -1)
        if(effect)
        {
            if(this.activated)
            {
                if(this.dinoRouletteDinoReaction.PlayReset())
                {
                    this.notwinCoroutine = this.StartCoroutine(this.ResetSetButtonsCoroutine(nicknameList))
                }
            }
        }
        else
        {
            this.RouletteLog("Button Active Time : " + MultiPlay.Timestamp)
            this.hideCount--;
            this.RouletteLog("hideCount : " + this.hideCount);
            if(this.hideCount <= 0)
            {
                this.hideCount = 0;
                this.dinoRouletteBottlesManager.SetButtons(nicknameList)
            }
        }
    }

    *ResetSetButtonsCoroutine(nicknameList : Array<string>)
    {
        this.RouletteLog("Start Reset Button Coroutine")
        yield new WaitForSeconds(this.buttonActiveDelay / 1000)
        this.RouletteLog("Button Active Time : " + MultiPlay.Timestamp)
        this.hideCount--;
        this.RouletteLog("hideCount : " + this.hideCount);
        if(this.hideCount <= 0)
        {
            this.hideCount = 0;
            this.dinoRouletteBottlesManager.SetButtons(nicknameList)
        }
    }

    ResetAll()
    {
        this.RouletteLog("ResetAll");
        if(this.notwinCoroutine != null)
        {
            this.StopCoroutine(this.notwinCoroutine)
            this.notwinCoroutine = null
        }
        if(this.winCoroutine != null)
        {
            this.StopCoroutine(this.winCoroutine)
            this.winCoroutine = null
        }
        this.dinoRouletteBottlesManager.ResetAll()
        this.dinoRouletteDinoReaction.ResetAll()
        this.RouletteLog("Reset hidecount");
        this.hideCount = 0;
    }

    OnPropActivate()
    {
        this.RouletteLog("Activate")
        var player = Players.GetMyPlayer()
        if(this.activated == true)
        {
            this.ResetRoulette(true, null)
        }
        if(player.IsMaster && this.activated == false)
        {
            this.dinoRouletteBottlesManager.HideAllButton()
            this.dinoRouletteSync.SyncReset()
        }
        this.activated = true
    }

    OnPropDeactivate()
    {
        this.RouletteLog("Deactivate")
        this.activated = false
        this.ResetRoulette(false, null)
        this.dinoRouletteBottlesManager.HideAllButton()
        this.ResetAll()
    }

};