import IFDol from './IFDol';
import { AvatarInteractionObject, InteractionButtons, Players, SideActionUIContent, SideActionUIData, UserInput, iflandButton, iflandButtonEntity } from 'ifland.PropEngine'
import { IFSBehaviour } from 'ifland.ScriptEngine'
import { Application, Debug, Events, GameObject, Quaternion, RuntimePlatform, Sprite, Transform, Vector3 } from 'UnityEngine';
import { Button } from 'UnityEngine.UI';

export default class ButtonEventController extends IFSBehaviour
{
    public interactionDistance : int = 5;
    public interactionButton : Button;
    public enterEditModeButton : iflandButton;
    public sideUISprite : Sprite;
    public endingScreenButton : Button;
    public stageButtonScrollContent : GameObject;
    public rootTransform : Transform;

    private changeStageButtonList : Button[];
    private myPlayerAIO : AvatarInteractionObject;

    Initialize(ifDol : IFDol)
    {
        this.myPlayerAIO = Players.GetMyPlayer();

        this.changeStageButtonList = new Array<Button>();
        this.changeStageButtonList = this.stageButtonScrollContent.GetComponentsInChildren<Button>();

        this.interactionButton.onClick.AddListener(() =>
        {
            if(Vector3.Distance(this.transform.position, this.myPlayerAIO.GetWorldPosition()) <= this.interactionDistance)
            {
                ifDol.Interaction();
            }
        });

        if(Players.GetMyPlayer().IsMaster)
        {
            let sideUIData = new SideActionUIData();
            let sideUIContent = new SideActionUIContent();
            sideUIContent.mainSprite = this.sideUISprite;
            sideUIContent.action = new Events.UnityEvent();
            sideUIContent.action.AddListener(() =>
            {
                // 편집 모드 닫기 버튼 터치
                UserInput.SideActionUIRelease(this, true);
                ifDol.ExitEditMode();
            });

            sideUIData.ActUIContents = [sideUIContent];

            this.enterEditModeButton.isVisable = true;
            this.enterEditModeButton.IsOnBillboarding = false;

            if(Application.platform == RuntimePlatform.WindowsEditor)
            {
                let ifDolRotation = this.rootTransform.localEulerAngles;
                this.enterEditModeButton.transform.localRotation = Quaternion.Euler(ifDolRotation.x, ifDolRotation.y, ifDolRotation.z);
            }
            
            this.enterEditModeButton.OnClick.AddListener((aio : AvatarInteractionObject) =>
            {
                // 편집 모드 진입 버튼 터치
                if(ifDol.EnterEditMode())
                {
                    UserInput.SideActionUIApply(this, sideUIData);
                }
            });

            const stageButtonLength = this.changeStageButtonList.length;
            for(let i = 0;i < stageButtonLength;i++)
            {
                this.changeStageButtonList[i].onClick.AddListener(() =>
                {
                    ifDol.ChangeStageButton(i);
                });
            }

            this.endingScreenButton.onClick.AddListener(() =>
            {
                ifDol.HideEndingScreen();
            });
        }
        else
        {
            this.enterEditModeButton.isVisable = false;
        }
    }
};