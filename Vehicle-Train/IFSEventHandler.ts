export class IFSEventBase
{
    protected onCallbackTable: Map<string, Function> = new Map<string, Function>();

    protected AddEvent(key: string, onCallback: Function) {
        if(this.onCallbackTable.has(key)) {
            return;
        }

        this.onCallbackTable.set(key, onCallback);
    }

    public RemoveEventListener(key: string) {
        if(!this.onCallbackTable.has(key)) {
            return;
        }

        this.onCallbackTable.delete(key);
    }

    public Clear() {
        this.onCallbackTable.clear();
    }

    protected InvokeEvent(...arg: any[]) {
        for (const [key, value] of this.onCallbackTable) {
            try
            {
                value(...arg);
            } catch(e) {
                console.error("<"+key+"> "+ e);
            } 
        }
    }
}

export class IFSEvent extends IFSEventBase
{
    public AddEventListener(key: string, callback: () => void) {
        this.AddEvent(key, callback);
    }

    public Invoke() {
        this.InvokeEvent();
    }
}

export class IFSEvent$1<T> extends IFSEventBase
{
    public AddEventListener(key: string, callback: (T) => void) {
        this.AddEvent(key, callback);
    }

    public Invoke(arg: T) {
        this.InvokeEvent(arg);
    }
};

export class IFSEvent$2<T1, T2> extends IFSEventBase
{
    public AddEventListener(key: string, callback: (T1, T2) => void) {
        this.AddEvent(key, callback);
    }

    public Invoke(arg1: T1, arg2: T2) {
        this.InvokeEvent(arg1, arg2);
    }
};

export class IFSEvent$3<T1, T2, T3> extends IFSEventBase
{
    public AddEventListener(key: string, callback: (T1, T2, T3) => void) {
        this.AddEvent(key, callback);
    }

    public Invoke(arg1: T1, arg2: T2, arg3: T3) {
        this.InvokeEvent(arg1, arg2, arg3);
    }
};

export class IFSEvent$4<T1, T2, T3, T4> extends IFSEventBase
{
    public AddEventListener(key: string, callback: (T1, T2, T3, T4) => void) {
        this.AddEvent(key, callback);
    }

    public Invoke(arg1: T1, arg2: T2, arg3: T3, arg4: T4) {
        this.InvokeEvent(arg1, arg2, arg3, arg4);
        
    }
};