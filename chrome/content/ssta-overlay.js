Components.utils.import("resource:///modules/virtualFolderWrapper.js");
Components.utils.import("resource://gre/modules/iteratorUtils.jsm");

miczSavedSearchThemAll={

goAllFromLocalFolders: false,
ConsiderOnlySubfolders: false,

  onLoad: function() {
    // initialization code
    initialized = true;
  },

  onMenuItemCommand: function(e) {
  
  let start_time=Date.now();
  
  var strbundle = document.getElementById("SavedSearchThemAll-string-bundle");
  var p_msg=strbundle.getString("promptMessage");
  var p_msg_af=strbundle.getString("promptMessage_AllFromLocalFolders");
  var p_msg_q=strbundle.getString("promptMessage_Question");
  var t_msg=strbundle.getString("promptTitle");
  
  var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
  prefs = prefs.getBranch("extensions.SavedSearchThemAll.");
  this.goAllFromLocalFolders= prefs.getBoolPref("AllFromLocalFolders");
  this.ConsiderOnlySubfolders= prefs.getBoolPref("ConsiderOnlySubfolders");
  
  var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);
  var p_msg_c=p_msg;
  if(this.goAllFromLocalFolders)p_msg_c+=" "+p_msg_af;
  p_msg_c+=" "+p_msg_q;
  if(!promptService.confirm(null,t_msg,p_msg_c))return;

if(!this.ConsiderOnlySubfolders){ //We want all folders
  var accountManager = Components.classes["@mozilla.org/messenger/account-manager;1"].getService(Components.interfaces.nsIMsgAccountManager);
  var allServers = accountManager.allServers;
  for(let currServer in fixIterator(allServers, Components.nsIMsgIncomingServer))
  {
   var rootFolder  = currServer.rootFolder;
    if (rootFolder)
    {
      var allFolders = Components.classes["@mozilla.org/array;1"].createInstance(Components.interfaces.nsIArray);
      rootFolder.ListDescendants(allFolders);
      for (let curr_folder in fixIterator(allFolders,Components.interfaces.nsIMsgFolder)){
          if(curr_folder.flags & nsMsgFolderFlags.Virtual){
           //alert('updating: '+curr_folder.name);
           var curr_uri_search_string=this.generateFoldersToSearchList(curr_folder.server);
            //alert("curr_uri= "+curr_uri_search_string);
            let virtualFolderWrapper = VirtualFolderHelper.wrapVirtualFolder(curr_folder);
            virtualFolderWrapper.searchFolders = curr_uri_search_string;
            virtualFolderWrapper.cleanUpMessageDatabase();
            accountManager.saveVirtualFolders();
          }
        }
    }
  }

if(this.goAllFromLocalFolders){
//Local Folder Virtual Folders will search on all accounts, but NOT ConsiderOnlySubfolders
  var qsAllFromLocalFolders="";
//Build up the global search_string
  for(let currServer in fixIterator(allServers, Components.nsIMsgIncomingServer))
  {
    qsAllFromLocalFolders+="|"+this.generateFoldersToSearchList(currServer);
    //alert("qs= "+qsAllFromLocalFolders.slice(1));
  }
//Assign the global search_string to all the Local Folders' saved search folders.
  for(let currServer in fixIterator(allServers, Components.nsIMsgIncomingServer))
  {
    if("Local Folders"==currServer.realHostName){
      var rootFolder  = currServer.rootFolder;
      if (rootFolder)
      {
        var allFolders = Components.classes["@mozilla.org/array;1"].createInstance(Components.interfaces.nsIArray);
        rootFolder.ListDescendants(allFolders);
        for (let curr_folder in fixIterator(allFolders,Components.interfaces.nsIMsgFolder)){
            if(curr_folder.flags & nsMsgFolderFlags.Virtual){
              //alert('updating: '+curr_folder.name);
              let virtualFolderWrapper = VirtualFolderHelper.wrapVirtualFolder(curr_folder);
              //alert(qsAllFromLocalFolders);
              virtualFolderWrapper.searchFolders = qsAllFromLocalFolders.slice(1);
              virtualFolderWrapper.cleanUpMessageDatabase();
              accountManager.saveVirtualFolders();
            }
          }
      }
    }
  }
}
}else{ //END if(!this.ConsiderOnlySubfolders) ... Now we are searching only for subfolders of current selected folders!!
  var accountManager = Components.classes["@mozilla.org/messenger/account-manager;1"].getService(Components.interfaces.nsIMsgAccountManager);
  var allServers = accountManager.allServers;
  for(let currServer in fixIterator(allServers, Components.nsIMsgIncomingServer))
  {
    var rootFolder  = currServer.rootFolder;
    if (rootFolder)
    {
      var allFolders = Components.classes["@mozilla.org/array;1"].createInstance(Components.interfaces.nsIArray);
      rootFolder.ListDescendants(allFolders);
        for (let curr_folder in fixIterator(allFolders,Components.interfaces.nsIMsgFolder)){
          if(curr_folder.flags & nsMsgFolderFlags.Virtual){
           //alert('updating: '+curr_folder.name);
           var curr_uri_search_string=this.generateFoldersToSearchListOnlySub(curr_folder);
            //alert("curr_uri= "+curr_uri_search_string);
            let virtualFolderWrapper = VirtualFolderHelper.wrapVirtualFolder(curr_folder);
            virtualFolderWrapper.searchFolders = curr_uri_search_string;//alert("curr_uri_search_string: "+curr_uri_search_string);
            virtualFolderWrapper.cleanUpMessageDatabase();
            accountManager.saveVirtualFolders();
          }
        }
    }
  }
}
     
   //Add and activity event
   let gActivityManager = Components.classes["@mozilla.org/activity-manager;1"].getService(Components.interfaces.nsIActivityManager);  
   let event = Components.classes["@mozilla.org/activity-event;1"].createInstance(Components.interfaces.nsIActivityEvent);  

    var am_msg=strbundle.getString("activityMessage");

    //Initiator is omitted  
    event.init(am_msg,
        null,   
       "Saved Search Them All!",   
       start_time,  // start time   
       Date.now());        // completion time  
           
    gActivityManager.addActivity(event);
},
  
  addFolderToSearchListString: function(aFolder, aCurrentSearchURIString)
{
  if (aCurrentSearchURIString)
    aCurrentSearchURIString += '|';
  aCurrentSearchURIString += aFolder.URI;

  return aCurrentSearchURIString;
},

processSearchSettingForFolder: function(aFolder, aCurrentSearchURIString, uri_array)
{
   if(-1===uri_array.indexOf(aFolder.URI)){
    aCurrentSearchURIString = this.addFolderToSearchListString(aFolder, aCurrentSearchURIString);
    uri_array.push(aFolder.URI);
   }
   return aCurrentSearchURIString;
},

checkSpecialFolder: function(curr_folder)
{	//we don't want to flag this folders for search
  is_special=false;
  if((curr_folder.flags & nsMsgFolderFlags.Mail)&&!(curr_folder.flags & nsMsgFolderFlags.Directory)&&!(curr_folder.flags & nsMsgFolderFlags.Elided)){
    is_special=(curr_folder.flags & nsMsgFolderFlags.Trash)||(curr_folder.flags & nsMsgFolderFlags.Archive)||(curr_folder.flags & nsMsgFolderFlags.Junk)||(curr_folder.flags & nsMsgFolderFlags.Templates)||(curr_folder.flags & nsMsgFolderFlags.Drafts);
  }
  return is_special;
},

generateFoldersToSearchList: function(server)
{
  let uriSearchString = "";
  let uri_array=new Array();

    var rootFolder  = server.QueryInterface(Components.interfaces.nsIMsgIncomingServer).rootFolder;
    if (rootFolder)
    {
      uriSearchString = "";
      var allFolders = Components.classes["@mozilla.org/array;1"].createInstance(Components.interfaces.nsIArray);
      rootFolder.ListDescendants(allFolders);
      for (let curr_folder in fixIterator(allFolders,Components.interfaces.nsIMsgFolder)){
          if(!(curr_folder.flags & nsMsgFolderFlags.Virtual)&&(!this.checkSpecialFolder(curr_folder))&&(curr_folder.server==server)) uriSearchString = this.processSearchSettingForFolder(curr_folder, uriSearchString,uri_array);
        }
}
  return uriSearchString;
},

generateFoldersToSearchListOnlySub: function(vfolder)
{
  let uriSearchString = "";
  let uri_array=new Array();

  if (vfolder)
  {
    uriSearchString = "";
    let virtualFolderWrapper = VirtualFolderHelper.wrapVirtualFolder(vfolder);
    selected_folders=virtualFolderWrapper.searchFolders;
    for each(let par_folder in selected_folders) {
      uriSearchString = this.processSearchSettingForFolder(par_folder, uriSearchString,uri_array);
      var par_folder_descendents=Components.classes["@mozilla.org/array;1"].createInstance(Components.interfaces.nsIArray);
      par_folder.ListDescendants(par_folder_descendents);
      for (let curr_folder in fixIterator(par_folder_descendents,Components.interfaces.nsIMsgFolder)){
        if(!(curr_folder.flags & nsMsgFolderFlags.Virtual)&&(!this.checkSpecialFolder(curr_folder))) uriSearchString = this.processSearchSettingForFolder(curr_folder, uriSearchString,uri_array);
      }
    }
  }
  return uriSearchString;
},
};

window.addEventListener("load", miczSavedSearchThemAll.onLoad, false);
