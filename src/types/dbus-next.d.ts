declare module 'dbus-next' {
    export interface DBusInterface {
      [key: string]: any;
    }
  
    export interface DBusProxyObject {
      getInterface(name: string): Promise<DBusInterface>;
    }
  
    export interface DBusBus {
      getProxyObject(name: string, path: string): Promise<DBusProxyObject>;
      callProxyMethod(...args: any[]): Promise<any>;
    }
  
    export function systemBus(): DBusBus;
  }