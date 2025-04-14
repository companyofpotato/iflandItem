import { IFSBehaviour } from 'ifland.ScriptEngine'
import { Debug, GameObject, Material } from 'UnityEngine'
import DinoRouletteBottle from './DinoRouletteBottle'
import { AvatarInteractionObject } from 'ifland.PropEngine'
import DinoRouletteSyncData from './DinoRouletteSyncData'

export default class DinoRouletteBottlesManager extends IFSBehaviour
{
    public bottleAnimLength_ms : float
    public bottleCount : int
    public bottleList : DinoRouletteBottle[]
    public nameTagEffect : GameObject
    private timeGapList : Array<int>;
    private syncDataList : Array<DinoRouletteSyncData>;

    BottleButtonClickedCallBack : (index : int, nickname : string) => void
    BottleAnimEndCallback : (syncData : DinoRouletteSyncData, timeGap : int) => void

    RouletteLog(str : string)
    {
        Debug.Log(" PIID : " + this.PropInstaceID + " [DinoRoulette] " + str)
    }

    Init(nameTagObject : GameObject, backgroundMaterial : Material)
    {
        this.timeGapList = new Array<int>(this.bottleCount);
        this.syncDataList = new Array<DinoRouletteSyncData>(this.bottleCount);

        this.bottleAnimLength_ms = 750
        if(this.nameTagEffect != null)
        {
            this.nameTagEffect.SetActive(false)
        }
        
        for(var i = 0;i < this.bottleCount;i++)
        {
            this.bottleList[i].Init(nameTagObject, this.nameTagEffect, this.bottleAnimLength_ms, backgroundMaterial)
            this.bottleList[i].ButtonClickedCallBack = this.ButtonClickedCallBack
            this.bottleList[i].AnimEndCallback = this.AnimEndCallback
        }
    }

    ButtonClickedCallBack(index : int, aio : AvatarInteractionObject)
    {
        this.RouletteLog("index : " + index + ", nickname : " + aio.AvatarNickname)
        this.HideAllButton()
        this.BottleButtonClickedCallBack(index, aio.AvatarNickname)
    }

    HideAllButton()
    {
        this.RouletteLog("Hide Buttons")
        for(var i = 0;i < this.bottleCount;i++)
        {
            this.bottleList[i].SetButtonVisible(false)
        }
    }

    SetButtons(pushedNicknameList : Array<string>)
    {
        this.RouletteLog("SetButtons : " + pushedNicknameList)
        for(var i = 0;i < this.bottleCount;i++)
        {
            this.bottleList[i].SetButtonVisible(pushedNicknameList[i].length == 0)
        }
    }

    AnimEndCallback(index : int)
    {
        this.RouletteLog("AnimEndCallback");
        this.BottleAnimEndCallback(this.syncDataList[index], this.timeGapList[index]);
    }

    ResetAll()
    {
        this.nameTagEffect.SetActive(false)
        for(var i = 0;i < this.bottleCount;i++)
        {
            this.bottleList[i].CancelAnim()
        }
    }

    SetBottles(pushedNicknameList : Array<string>, index : int)
    {
        this.RouletteLog("List : " + pushedNicknameList)
        for(var i = 0;i < this.bottleCount;i++)
        {
            this.bottleList[i].SetNameTagActive(false)
            this.bottleList[i].SetBottleActive(false)
            if(pushedNicknameList[i].length > 0 && index != i)
            {
                this.bottleList[i].SetBottleActive(true)
                this.bottleList[i].SetBottle(pushedNicknameList[i])
            }
        }
    }

    AddBottle(syncData : DinoRouletteSyncData, gap : number)
    {
        var index = syncData.lastPushedBottle;
        var nickname = syncData.pushedNicknameList[syncData.lastPushedBottle];
        this.RouletteLog("AddBottle : " + index + ", " + nickname + ", " + gap)
        this.timeGapList[index] = gap;
        this.syncDataList[index] = JSON.parse(JSON.stringify(syncData));
        this.bottleList[index].SetBottleActive(true)
        this.bottleList[index].Add(nickname, gap)
    }
};