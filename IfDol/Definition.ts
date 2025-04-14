enum PropSettingResultCode
{
    PropMetaIsNull = 0,
    EndingIsWrong,
    EndingShownIsNull
}

enum ToastCode
{
    Update_App = 0,
    Error_Network,
    Error_Common
}

enum ActionType
{
    ChangeStage = 0,
    NormalInteraction = 1,
    HostInteraction = 2
}

export default class Definition
{
    static PropSettingResultCode = PropSettingResultCode;
    static ToastCode = ToastCode;
    static ActionType = ActionType;
}