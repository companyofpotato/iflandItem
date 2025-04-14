import { KeyValueData, Lab, Land, MultiPlay, Players } from 'ifland.PropEngine';
import { Animation, GameObject, Transform, Vector3 } from 'UnityEngine';
import { IFSBehaviour } from 'ifland.ScriptEngine';
import VehicleTemplate from './VehicleTemplate';

export default class VehicleParkingStateController extends IFSBehaviour
{
    public VehicleParkingAnimation: Animation;
    public VehicleMainTemplate: VehicleTemplate;
    public VendingMachine: GameObject;
    public ModelRoot: Transform;
    private isMySpace: bool = false;
    private isParking: bool = true;

    OnPreviewStart() {
        this.OnInit();
    }

    Awake() {
        this.OnInit();
    }

    Update() {
        if(this.VehicleMainTemplate == undefined) {
            this.enabled = false;
            return;
        }

        var isParking = this.VehicleMainTemplate.IsParking();
        if(this.isParking == isParking) {
            return;
        }

        this.isParking = isParking;
        if(this.isParking) {
            console.log("[VehicleParkingStateController] - ParkingOn");
            this.VehicleParkingAnimation.enabled = true;
        } else {
            console.log("[VehicleParkingStateController] - ParkingOff");
            this.VehicleParkingAnimation.enabled = false;
            this.ModelRoot.localPosition = Vector3.zero;
        }
    }

    OnPropActivate() {
        this.isMySpace = Land.connectSession == Land.ConnectSession.ifHome;
        if(this.isMySpace){
            if(Land.ifHomeID == Players.GetMyUserIdx()) {
                var array = new Array(1);
                array[0] = new KeyValueData("activeTriggerObjectList", 1);
                console.log("[VehicleParkingStateController][ModifyPropSetting-ifHome] Try - PIID: "+this.PropInstaceID);
                Lab.ModifyPropSetting(this.PropInstaceID, array, (isSuccess) => {
                    console.log("[VehicleParkingStateController][ModifyPropSetting-ifHome] isSuccess? "+isSuccess);
                });
            }
        }
    }

    private OnInit() {
        var isMySpace = Land.connectSession == Land.ConnectSession.ifHome;
        if(isMySpace) {
            console.log("[VehicleParkingStateController][OnInit] ifHome");
            this.VehicleParkingAnimation.enabled = true;
            this.VendingMachine.SetActive(true);
            this.enabled = true;

        } else {
            console.log("[VehicleParkingStateController][OnInit] ifSquare");
            this.VehicleParkingAnimation.enabled = false;
            this.VendingMachine.SetActive(false);
            this.enabled = false;
        }
    }
};