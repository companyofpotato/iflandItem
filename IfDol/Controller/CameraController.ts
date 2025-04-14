import { IFSBehaviour } from 'ifland.ScriptEngine'
import CameraModeData from '../Model/CameraModeData'
import { CameraControl, Players } from 'ifland.PropEngine';

export default class CameraController extends IFSBehaviour
{
    public cameraModeData : CameraModeData;

    public EnterEditMode()
    {
        this.cameraModeData.SetOriginOffset(CameraControl.Offset);
        this.cameraModeData.SetOriginZoomDistance(CameraControl.ZoomDistance);
        this.cameraModeData.SetOriginRotation(CameraControl.WorldRotation);

        CameraControl.ZoomChange(this.cameraModeData.GetEditModeZoomDistance());
        CameraControl.Rotate(this.cameraModeData.GetEditModeSpot().rotation);
        CameraControl.SetTracking(this.transform);
    }

    public ExitEditMode()
    {
        CameraControl.SetTracking(Players.GetMyPlayer().transform, this.cameraModeData.GetOriginOffset());
        CameraControl.ZoomChange(this.cameraModeData.GetOriginZoomDistance());
        CameraControl.Rotate(this.cameraModeData.GetOriginRotation());
    }
};