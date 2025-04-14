import { Configuration, InteractionButtons, Lab, LanguageType, Native, UserInput } from 'ifland.PropEngine';
import EditModeUI from '../View/EditModeUI';
import InteractionUI from '../View/InteractionUI';
import { ECompareToken, IFSBehaviour } from 'ifland.ScriptEngine';
import SpeechBubbleUI from '../View/SpeechBubbleUI';
import { Debug, GameObject, Material, Texture, Transform } from 'UnityEngine';
import EndingScreenUI from '../View/EndingScreenUI';
import Definition from '../Definition';

export default class UIController extends IFSBehaviour
{
    public modelingsObject : GameObject;
    public interactionUI : InteractionUI;
    public editModeUI : EditModeUI;
    public endingScreenUI : EndingScreenUI;
    public bgUIMaterial : Material;
    public imageUIMaterial : Material;
    public speechBubbleMaterial : Material;

    public renderQueueUIValue : int;

    private currentSelectedStage : int;
    private currentSpeechBubbleStage : int;
    private isKorean : bool;
    private isEditMode : bool;
    private isEndingShowing : bool;

    private speechBubbleUIList : SpeechBubbleUI[];

    public Initialize(maxStage : int)
    {
        this.isKorean = true;
        this.isKorean = this.CheckKorean();

        this.interactionUI.gameObject.SetActive(true);

        this.speechBubbleUIList = this.modelingsObject.GetComponentsInChildren<SpeechBubbleUI>();

        this.bgUIMaterial.renderQueue = this.renderQueueUIValue;
        this.imageUIMaterial.renderQueue = this.renderQueueUIValue;
        this.speechBubbleMaterial.renderQueue = this.renderQueueUIValue;

        this.interactionUI.Initialize(this.renderQueueUIValue);
        this.editModeUI.Initialize(maxStage);

        for(let idx = 0;idx < this.speechBubbleUIList.length;idx++)
        {
            this.speechBubbleUIList[idx].Initialize(this.renderQueueUIValue);
        }

        this.currentSelectedStage = 0;
        this.currentSpeechBubbleStage = 0;

        this.endingScreenUI.Initialize(this.isKorean);
        this.isEditMode = false;
        this.isEndingShowing = false;
    }

    public ForceUpdate()
    {
        this.editModeUI.ForceUpdate();
    }

    public SetEditButtonTexture(stage : int, texture : Texture)
    {
        this.editModeUI.SetButtonTexture(stage, texture);
    }

    public SetEndingButtonTexture(texture : Texture)
    {
        this.editModeUI.SetEndingButtonTexture(texture);
    }

    public SetInteractionUIData(score : int, unlockScore : int, prevUnlockScore : int, stage : int)
    {
        this.interactionUI.SetContent(score, unlockScore, prevUnlockScore, stage + 1);
    }

    public SetButtonPosition(y : float)
    {
        let value = y * 1.1 + 0.4;
        this.interactionUI.SetPositionY(value);
        this.editModeUI.SetPositionY(value);
    }

    public PlayInteractionGlowEffect()
    {
        this.interactionUI.PlayInteractionGlowEffect();
    }

    public EnterEditMode(currentStage : int, unlockedStage : int)
    {
        this.isEditMode = true;
        this.HideNativeUI();
        InteractionButtons.RequestButtonsHide(this);
        Lab.RequestBuiltInPropInteractionButtonsHide(this);
        UserInput.RequestJumpButtonHide(this);
        UserInput.RequestEmotionUIHide(this);
        UserInput.RequestJoystickButtonHide(this);

        this.editModeUI.EnterEditMode(currentStage, unlockedStage);

        this.ChangeStage(currentStage);

        this.editModeUI.ChangePage(currentStage);
    }

    public ExitEditMode()
    {
        this.isEditMode = false;
        this.ShowNativeUI();
        InteractionButtons.RequestButtonsShow(this);
        Lab.RequestBuiltInPropInteractionButtonsShow(this);
        UserInput.RequestJumpButtonShow(this);
        UserInput.RequestEmotionUIShow(this);
        UserInput.RequestJoystickButtonShow(this);
        
        this.editModeUI.ExitEditMode();
    }

    public ChangeStage(stage : int)
    {
        Debug.Log("[IFDol] Change stage from " + this.currentSelectedStage + " to " + stage);
        this.editModeUI.DeselectStage(this.currentSelectedStage);
        this.editModeUI.SelectStage(stage);
        this.currentSelectedStage = stage;
    }

    public ChangeUnlockedStage(stage : int)
    {
        this.editModeUI.ChangeUnlockedStage(stage);
    }

    public GetCurrentSelectedStage() : int
    {
        return this.currentSelectedStage;
    }

    public CheckSelectable(stage : int) : bool
    {
        return !(this.editModeUI.CheckLocked(stage));
    }

    public ShowSpeechBubble(stage : int)
    {
        this.speechBubbleUIList[this.currentSpeechBubbleStage].HideSpeechBubble();
        this.speechBubbleUIList[stage].ShowSpeechBubble();

        this.currentSpeechBubbleStage = stage;
    }

    public HideAllUI()
    {
        this.interactionUI.gameObject.SetActive(false);

        this.speechBubbleUIList[this.currentSpeechBubbleStage].HideSpeechBubble();
    }

    public ShowAllUI()
    {
        this.interactionUI.gameObject.SetActive(true);

        this.speechBubbleUIList[this.currentSpeechBubbleStage].ShowSpeechBubble();
    }

    public ShowEndingScreen()
    {
        this.isEndingShowing = true;
        this.HideNativeUI();
        this.endingScreenUI.ShowEndingScreen();
    }

    public HideEndingScreen()
    {
        this.isEndingShowing = false;
        this.ShowNativeUI();
        this.endingScreenUI.HideEndingScreen();
        this.interactionUI.HideUIByEnding();
        this.editModeUI.SetPositionX(0.3);
    }

    public ShowNativeUI()
    {
        if(this.isEditMode == false && this.isEndingShowing == false)
        {
            Native.UndoNativeUIMode(this);
        }
    }

    public HideNativeUI()
    {
        if(this.isEditMode || this.isEndingShowing)
        {
            Native.SetNativeUIMode(this, Native.NativeUIMode.HideAllUI);
        }
    }

    public ShowInteractionUI()
    {
        this.interactionUI.gameObject.SetActive(true);
    }

    public HideInteractionUI()
    {
        this.interactionUI.gameObject.SetActive(false);
    }

    public ShowToast(key : int)
    {
        let msg = "";
        switch(key)
        {
            case Definition.ToastCode.Update_App : 
                msg = Lab.GetMultilingualText("playitem_item_common_toast_popup_update_app");
                break;
            case Definition.ToastCode.Error_Network : 
                msg = Lab.GetMultilingualText("playitem_item_common_toast_popup_error_network");
                break;
            case Definition.ToastCode.Error_Common : 
                msg = Lab.GetMultilingualText("playitem_item_common_toast_popup_error_common");
                break;
        }
        Native.ShowToast(this, msg);
    }

    public EnableInteractionButton()
    {
        this.interactionUI.EnableButton();
    }

    public DisableInteractionButton()
    {
        this.interactionUI.DisableButton();
    }

    private CheckKorean() : bool
    {
        if($CompareVersion("1.2.6", ECompareToken.Equal) || $CompareVersion("1.2.6", ECompareToken.OrLess))
        {
            var language2 = Configuration.GetLanguage();
            if(language2 == LanguageType.Korean)
            {
                return true;
            }
            else
            {
                return false;
            }
        }
        else
        {
            var language = Configuration.GetAppLanguage();
            if(language == "ko")
            {
                return true;
            }
            else
            {
                return false;
            }
        }
    }

};