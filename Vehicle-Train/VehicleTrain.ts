import { IFSBehaviour } from 'ifland.ScriptEngine'
import VehicleTemplate, {EVehicleState} from './VehicleTemplate'
import VehicleMoveController from './VehicleMoveController'
import { AvatarInteractionObject, MultiPlay, Players, iflandButton } from 'ifland.PropEngine'
import { Debug, Material, MeshRenderer, Transform, Vector3 } from 'UnityEngine'

export default class VehicleTrain extends IFSBehaviour
{
    public mainTemplate : VehicleTemplate;
    public moveController : VehicleMoveController;
    public getOnButton : iflandButton;
    public trainBodyMeshRenderer : MeshRenderer;
    public trainHandleMeshRenderer : MeshRenderer;
    public wheelList : Transform[];
    public frontMaterial : Material[];
    public backMaterial : Material[]; //바퀴 Texture도 같이 포함되어 있다.
    public handleMaterial : Material[];

    private renderQueueValue : int = 3055;

    private TrainLog(txt : string)
    {
        Debug.Log("[Train] " + txt);
    }

    Awake()
    {
        this.getOnButton.OnClick.AddListener((aio) => 
        {
            this.OnGetOnButtonClicked(aio);
        });
        this.ChangeRenderQueue();

        this.mainTemplate.FixedUpdateEventHandler.AddEventListener("VehicleTrain", this.onFixedUpdate)
    }

    private ChangeRenderQueue()
    {
        this.frontMaterial.forEach(element =>
        {
            element.renderQueue = this.renderQueueValue;
        });

        this.backMaterial.forEach(element =>
        {
            element.renderQueue = this.renderQueueValue;
        });

        this.handleMaterial.forEach(element =>
        {
            element.renderQueue = this.renderQueueValue;
        });
    }

    public onFixedUpdate(fixedDeltaTime: float, state: EVehicleState, planDistance: float,  isGrounded: bool)
    {
        var velocity = this.moveController.GetLastMoveVelocity();
        if(velocity != Vector3.zero)
        {
            // this.TrainLog("Controller Velocity : " + velocity.magnitude / fixedDeltaTime);
            this.RotateWheel(velocity.magnitude / fixedDeltaTime);
        }

        var speed = this.mainTemplate.GetEstimatedSpeed();
        if(speed != 0)
        {
            // this.TrainLog("Template Speed : " + speed);
            this.RotateWheel(speed);
        }
    }

    public RotateWheel(speed : number)
    {
        this.wheelList.forEach(element =>
        {
            element.Rotate(new Vector3(speed, 0, 0));
        });
    }
    
    private OnGetOnButtonClicked(aio : AvatarInteractionObject)
    {
        var num = Math.floor(Math.random() * 3);
        MultiPlay.Sync(this, num);
    }

    OnSync(num : number)
    {
        this.TrainLog("OnSync Texture number : " + num);
        this.ChangeTrainMaterial(num);
    }

    OnSyncServer(num : number)
    {
        if(num == null)
        {
            return;
        }
        this.TrainLog("OnSyncServer Texture number : " + num);
        this.ChangeTrainMaterial(num);
    }

    ChangeTrainMaterial(num : number)
    {
        var mats = this.trainBodyMeshRenderer.materials;
        mats[0] = this.backMaterial[num];
        mats[1] = this.frontMaterial[num];
        mats[2] = this.handleMaterial[num];
        this.trainBodyMeshRenderer.materials = mats;

        this.trainHandleMeshRenderer.material = this.handleMaterial[num];

        this.wheelList.forEach(element =>
        {
            element.GetComponent<MeshRenderer>().material = this.backMaterial[num];
        });
    }
};