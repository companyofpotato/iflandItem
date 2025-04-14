import { IFSBehaviour } from 'ifland.ScriptEngine'
import { Color, GameObject, Texture, Debug, Input, Coroutine, Time, Transform, Vector3, Canvas, RectTransform, KeyCode, WaitForEndOfFrame, WaitForFixedUpdate, Object } from 'UnityEngine'
import { Image, LayoutRebuilder, ScrollRect } from 'UnityEngine.UI';
import StageButton from './StageButton';
import { Players } from 'ifland.PropEngine';

export default class EditModeUI extends IFSBehaviour
{
    public editButtonTransform : Transform;
    public canvasObject : GameObject;
    public buttonListObject : GameObject;
    public pageListObject : GameObject;
    public scrollRect : ScrollRect
    public moveSpeed : float;
    public moveInterval : float;
    public stopInterval : float;
    public contentListTransform : RectTransform;
    public stageButtonPrefab : GameObject;
    public dummyButtonPrefab : GameObject;
    public pageImagePrefab : GameObject;
    
    private pageImageList : Image[];
    private stageButtonList : StageButton[];
    private stageCount : int;
    private normalCount : int;
    private stagePerPage : int = 5;
    private pageCount : int;
    private isEditMode : bool;
    private moveCoroutine : Coroutine;
    private deltaTime : number;
    private interval : number;
    private currentPage : int;
    private downPos : number;

    ForceUpdate()
    {
        Debug.Log("[IFDol] Force Update Layout");
        LayoutRebuilder.ForceRebuildLayoutImmediate(this.contentListTransform);
        Canvas.ForceUpdateCanvases();
    }

    Update()
    {
        if(this.isEditMode && this.pageCount > 1)
        {
            if(Input.GetMouseButtonDown(0))
            {
                // Debug.Log("[njh] down " + this.scrollRect.normalizedPosition.x);
                this.downPos = this.scrollRect.normalizedPosition.x;
            }
            if(Input.GetMouseButtonUp(0))
            {
                // Debug.Log("[njh] up " + this.scrollRect.normalizedPosition.x);
                this.MoveToClosePage(this.scrollRect.normalizedPosition.x);
            }
        }
    }

    public SetPositionY(value : float)
    {
        this.editButtonTransform.localPosition = new Vector3(this.editButtonTransform.localPosition.x, value, 0);
    }
    
    public SetPositionX(value : float)
    {
        this.editButtonTransform.localPosition = new Vector3(value, this.editButtonTransform.localPosition.y, 0);
    }

    private MoveToClosePage(value : number)
    {
        let movedDistance;

        movedDistance = Math.abs(this.downPos - value);
        if(movedDistance <= this.stopInterval)
        {
            return;
        }

        if(this.moveCoroutine != null)
        {
            this.StopCoroutine(this.moveCoroutine);
            this.moveCoroutine = null;
        }

        Debug.Log("[njh] interval " + this.interval);

        if(value < 0)
        {
            this.moveCoroutine = this.StartCoroutine(this.MoveCoroutine(value, 0, 0));
            return;
        }

        if(value > 1)
        {
            this.moveCoroutine = this.StartCoroutine(this.MoveCoroutine(value, 1, this.pageCount - 1));
            return;
        }

        if(this.downPos < value)
        {
            movedDistance = value - this.downPos;
            if(movedDistance >= this.moveInterval)
            {
                this.moveCoroutine = this.StartCoroutine(this.MoveCoroutine(value, this.interval * (this.currentPage + 1), (this.currentPage + 1)));
            }
            else
            {
                this.moveCoroutine = this.StartCoroutine(this.MoveCoroutine(value, this.interval * this.currentPage, this.currentPage));
            }
        }
        else
        {
            movedDistance = this.downPos - value;
            if(movedDistance >= this.moveInterval)
            {
                this.moveCoroutine = this.StartCoroutine(this.MoveCoroutine(value, this.interval * (this.currentPage - 1), (this.currentPage - 1)));
            }
            else
            {
                this.moveCoroutine = this.StartCoroutine(this.MoveCoroutine(value, this.interval * this.currentPage, this.currentPage));
            }
        }
    }

    private *MoveCoroutine(startPos : number, targetPos : number, targetPage : int)
    {
        Debug.Log("[njh] start : " + startPos + ", target : " + targetPos);
        
        if(startPos < targetPos)
        {
            while(startPos <= targetPos)
            {
                startPos += this.moveSpeed * this.deltaTime;
                this.scrollRect.horizontalNormalizedPosition = startPos;
                yield null;
            }
            startPos = targetPos;
            this.scrollRect.horizontalNormalizedPosition = startPos;
        }
        else
        {
            while(startPos >= targetPos)
            {
                startPos -= this.moveSpeed * this.deltaTime;
                this.scrollRect.horizontalNormalizedPosition = startPos;
                yield null;
            }
            startPos = targetPos;
            this.scrollRect.horizontalNormalizedPosition = startPos;
        }
        this.moveCoroutine = null;

        let tc : Color;

        tc = this.pageImageList[this.currentPage].color
        tc.a = 0.3;
        this.pageImageList[this.currentPage].color = tc;

        tc = this.pageImageList[targetPage].color
        tc.a = 1;
        this.pageImageList[targetPage].color = tc;

        this.currentPage = targetPage;
    }

    public Initialize(maxStage : int)
    {
        this.isEditMode = false;
        this.deltaTime = Time.deltaTime;

        this.stageCount = maxStage + 1;
        this.normalCount = maxStage;

        this.pageCount = Math.floor(this.stageCount / this.stagePerPage);
        if(this.stageCount % this.stagePerPage > 0)
        {
            this.pageCount += 1;
        }
        this.interval = 1 / (this.pageCount - 1);
        this.moveInterval *= this.interval;

        for(let idx = 0;idx < this.pageCount;idx++)
        {
            Object.Instantiate(this.pageImagePrefab, this.pageListObject.transform);
        }
        this.pageImageList = this.pageListObject.GetComponentsInChildren<Image>();
        
        let wholeCount = this.pageCount * this.stagePerPage;

        for(let idx = 0;idx < wholeCount;idx++)
        {
            if(idx >= this.stageCount)
            {
                Object.Instantiate(this.dummyButtonPrefab, this.buttonListObject.transform);
            }
            else
            {
                Object.Instantiate(this.stageButtonPrefab, this.buttonListObject.transform);
            }
        }

        this.ShowStageButtonList();
        this.stageButtonList = this.buttonListObject.GetComponentsInChildren<StageButton>();
        this.HideStageButtonList();
    }

    public SetButtonTexture(idx : int, texture : Texture)
    {
        this.stageButtonList[idx].Initialize(idx, texture);
    }

    public SetEndingButtonTexture(texture : Texture)
    {
        this.stageButtonList[this.normalCount].InitializeEnding(texture);
    }

    public ShowStageButtonList()
    {
        this.isEditMode = true;
        this.canvasObject.SetActive(true);
    }

    public HideStageButtonList()
    {
        this.isEditMode = false;
        this.canvasObject.SetActive(false);
    }

    public ChangePage(stage : int)
    {
        if(stage > this.normalCount)
        {
            stage = this.normalCount;
        }

        let pageNum : int = stage / 5;
        let tc : Color;
        pageNum = Math.floor(pageNum);
        this.currentPage = pageNum;
        this.scrollRect.horizontalNormalizedPosition = this.interval * pageNum;
        for(let idx = 0;idx < this.pageCount;idx++)
        {
            if(idx == pageNum)
            {
                tc = this.pageImageList[idx].color
                tc.a = 1;
                this.pageImageList[idx].color = tc;
            }
            else
            {
                tc = this.pageImageList[idx].color
                tc.a = 0.3;
                this.pageImageList[idx].color = tc;
            }
        }
    }

    public SelectStage(stage : int)
    {
        if(stage > this.normalCount)
        {
            stage = this.normalCount;
        }

        this.stageButtonList[stage].Select();
    }

    public DeselectStage(stage : int)
    {
        if(stage > this.normalCount)
        {
            stage = this.normalCount;
        }

        this.stageButtonList[stage].Deselect();
    }

    public LockStage(stage : int)
    {
        if(stage > this.normalCount)
        {
            stage = this.normalCount;
        }

        this.stageButtonList[stage].Lock();
    }

    public UnlockStage(stage : int)
    {
        if(stage > this.normalCount)
        {
            stage = this.normalCount;
        }

        this.stageButtonList[stage].Unlock();
    }

    public ChangeUnlockedStage(unlockedStage : int)
    {
        if(unlockedStage > this.normalCount)
        {
            unlockedStage = this.normalCount;
        }

        let idx = 0;

        for(;idx < this.stageCount;idx++)
        {
            if(idx <= unlockedStage)
            {
                if(idx < this.normalCount) // 일반 레벨
                {
                    this.stageButtonList[idx].Unlock();
                    
                    if(idx != unlockedStage)
                    {
                        this.stageButtonList[idx].Clear();
                    }
                }
                else // 엔딩
                {
                    this.stageButtonList[idx].UnlockEnding();
                    this.stageButtonList[idx].Clear();
                }
            }
            else
            {
                this.stageButtonList[idx].Lock();
            }
        }
    }

    public EnterEditMode(currentStage : int, unlockedStage : int)
    {
        this.SetMiniball(false);

        if(currentStage > this.normalCount)
        {
            currentStage = this.normalCount;
        }

        if(unlockedStage > this.normalCount)
        {
            unlockedStage = this.normalCount;
        }

        let idx = 0;

        for(;idx < this.stageCount;idx++)
        {
            if(idx <= unlockedStage)
            {
                if(idx < this.normalCount) // 일반 레벨
                {
                    this.stageButtonList[idx].Unlock();
                    
                    if(idx != unlockedStage)
                    {
                        this.stageButtonList[idx].Clear();
                    }
                }
                else // 엔딩
                {
                    this.stageButtonList[idx].UnlockEnding();
                    this.stageButtonList[idx].Clear();
                }

                if(idx == currentStage)
                {
                    this.stageButtonList[idx].Select();
                }
                else
                {
                    this.stageButtonList[idx].Deselect();
                }
            }
            else
            {
                this.stageButtonList[idx].Lock();
            }
        }

        this.ShowStageButtonList();
    }

    public ExitEditMode()
    {
        this.SetMiniball(true);
        this.HideStageButtonList();
    }

    public CheckLocked(stage : int) : bool
    {
        if(stage > this.normalCount)
        {
            stage = this.normalCount;
        }

        return this.stageButtonList[stage].CheckLocked();
    }

    private SetMiniball(isActive : bool)
    {
        let allAIO = Players.GetAllPlayers();
        allAIO.forEach(aio =>
            {
                aio.EnableMiniball = isActive;
            }
        )
    }
    
    OnJoinUser(userIdx : int)
    {
        if(this.isEditMode)
        {
            Debug.Log("[IFDol] OnJoinUser while Edit Mode : " + userIdx);
            let aio = Players.GetPlayer(userIdx);
            if(aio != null)
            {
                aio.EnableMiniball = false;
            }
        }
    }
};