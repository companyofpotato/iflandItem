import { Land, ServerAPI } from 'ifland.PropEngine';
import { IFSBehaviour } from 'ifland.ScriptEngine';
import { Debug } from 'UnityEngine';
import MediaTowerVideoData from './MediaTowerVideoData';

export default class MediaTowerAPI extends IFSBehaviour
{
    private videoData : MediaTowerVideoData = new MediaTowerVideoData();
    private alreadyRequestPostDetail : bool = false;
    private alreadyRequestShortFormList : bool = false;
    private videoCount : int;
    private requestVideoCount : int = 10;

    RequestShortFormListCallback : (videoData : MediaTowerVideoData) => void;

    TowerLog(str : string)
    {
        Debug.Log("PIID : " + this.PropInstaceID + " [MediaTower] " + str);
    }

    CheckShortForm(postNo : number, complete:(result : bool, def : bool) => void)
    {
        if(this.alreadyRequestPostDetail)
        {
            this.TowerLog("Already Requesting Post Detail");
            return;
        }
        this.alreadyRequestPostDetail = true;

        ServerAPI.RequestPostDetail(BigInt(postNo), (isSuccess, jsonData) =>
        {
            this.TowerLog("RequestPostDetail Result : " + isSuccess);
            if(isSuccess == false)
            {
                complete(isSuccess, false);
                return;
            }

            let data = JSON.parse(jsonData);

            complete(isSuccess, data.data.post.postType == "SHORTFORM");

            this.alreadyRequestPostDetail = false;
        });
    }

    RequestShortFormList(maxCount : int)
    {
        if(this.alreadyRequestShortFormList)
        {
            this.TowerLog("Already Requesting ShortForm List");
            return;
        }
        this.alreadyRequestShortFormList = true;

        this.TowerLog("Requesting ShortForm List");
        this.videoData.Reset();

        this.videoCount = maxCount;

        this.RequestList(-1);
    }

    RequestList(lastPostNo : int)
    {
        // ServerAPI.RequestPostList(1118204, BigInt(lastPostNo), "SHORTFORM", this.requestVideoCount, (isSuccess, strData) =>
        ServerAPI.RequestPostList(Land.ifHomeID, BigInt(lastPostNo), "SHORTFORM", this.requestVideoCount, (isSuccess, strData) =>
        {
            this.TowerLog("RequestShortForm Result : " + isSuccess);
            if(isSuccess == false)
            {
                this.alreadyRequestShortFormList = false;
                this.RequestShortFormListCallback(this.videoData);
                return;
            }

            let jsonData = JSON.parse(strData);

            let jsonLength = jsonData.data.postList.length;

            // let filteredList = jsonData.data.postList.filter(element => element.processYn != "N" && element.status == 0);

            jsonData.data.postList.forEach(element =>
            {
                if(element.processYn == "N")
                {
                    this.TowerLog("process is not completed");
                }
                else if(element.status != 0)
                {
                    this.TowerLog("status is not normal : " + element.status);
                }
                else
                {
                    element.mbrPstImageList.forEach(element2 =>
                    {
                        if(this.videoData.GetLength() < this.videoCount && element2.pstMovieYn == "Y")
                        {
                            if(element2.originalUrl == "")
                            {
                                this.TowerLog("original url empty");
                            }
                            else
                            {
                                this.videoData.Push(element.mbrPostNo, element2.originalUrl);
                            }
                        }
                    });
                }
            });
            
            if(this.videoData.GetLength() == this.videoCount)
            {
                this.TowerLog("Complete Request");
                this.alreadyRequestShortFormList = false;
                this.RequestShortFormListCallback(this.videoData);
            }
            else
            {
                if(jsonLength < this.requestVideoCount)
                {
                    this.TowerLog("Don't Resend Request. Current list length is smaller than request list length : " + jsonLength);
                    this.alreadyRequestShortFormList = false;
                    this.RequestShortFormListCallback(this.videoData);
                }
                else
                {
                    this.TowerLog("Resend Request");
                    this.RequestList(jsonData.data.postList[jsonLength - 1].mbrPostNo);
                }
            }
        });
    }
}