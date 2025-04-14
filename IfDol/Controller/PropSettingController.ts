import { KeyValueData, Lab, Props } from 'ifland.PropEngine';
import PropSettingData from './PropSettingData'
import { IFSBehaviour } from 'ifland.ScriptEngine'
import Definition from '../Definition';

export default class PropSettingController extends IFSBehaviour
{
    private currentPropSettingData : PropSettingData;
    private keyValueData : KeyValueData[]

    public LoadPropSetting(OnResult : (isSuccess : bool, resultCode : int, data : PropSettingData) => void)
    {
        this.currentPropSettingData = new PropSettingData();

        var propMeta = Props.GetPropMetadata(this.PropInstaceID);
        
        if(propMeta == null)
        {
            OnResult(false, Definition.PropSettingResultCode.PropMetaIsNull, null);
        }
        else
        {
            this.currentPropSettingData.ending = propMeta.GetVariant("Ending");
            if(this.currentPropSettingData.ending == null)
            {
                OnResult(false, Definition.PropSettingResultCode.EndingIsWrong, null);
                return;
            }

            this.currentPropSettingData.endingShown = propMeta.GetVariant("EndingShown");
            if(this.currentPropSettingData.endingShown == null)
            {
                OnResult(false, Definition.PropSettingResultCode.EndingShownIsNull, null);
                return;
            }

            OnResult(true, -1, this.currentPropSettingData);
        }
    }

    public ModifyEnding(ending : int)
    {
        this.currentPropSettingData.ending = ending;
    }

    public ModifyEndingShown(endingShown : bool)
    {
        this.currentPropSettingData.endingShown = endingShown;
    }

    public SavePropSetting(OnResult : (isSuccess : bool) => void)
    {
        this.keyValueData = new Array(2);

        this.keyValueData[0] = new KeyValueData();
        this.keyValueData[0].SetIntData("Ending", this.currentPropSettingData.ending);
        this.keyValueData[1] = new KeyValueData();
        this.keyValueData[1].SetBoolData("EndingShown", this.currentPropSettingData.endingShown);

        Lab.ModifyPropSetting(this.PropInstaceID, this.keyValueData,
            (result) =>
            {
                OnResult(result);
            })
    }
};