Components.utils.import("resource:///modules/virtualFolderWrapper.js");

if(!it) var it={};
if(!it.micz) it.micz={};
if(!it.micz.SavedSearchThemAll) it.micz.SavedSearchThemAll={};

it.micz.SavedSearchThemAll = {

goAllFromLocalFolders: false,
ConsiderOnlySubfolders: false,

  onLoad: function() {
    // initialization code
    initialized = true;
  },

  onMenuItemCommand: function(e) {
  
  let start_time=Date.now();
  
  //this.strings = document.getElementById("SavedSearchThemAll-strings");
  
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

  var accountManager = Components.classes["@mozilla.org/messenger/account-manager;1"].getService(Components.interfaces.nsIMsgAccountManager);
  var allServers = accountManager.allServers;
  var numServers = allServers.Count();
  for (var index = 0; index < numServers; index++)
  {
    //alert(allServers.GetElementAt(index).realHostName);
    //alert('account: '+index);
    var rootFolder  = allServers.GetElementAt(index).QueryInterface(Components.interfaces.nsIMsgIncomingServer).rootFolder;
    if (rootFolder)
    {
      //alert(allServers[index]);
      var allFolders = Components.classes["@mozilla.org/supports-array;1"].createInstance(Components.interfaces.nsISupportsArray);
      rootFolder.ListDescendents(allFolders);
      var numFolders = allFolders.Count();
      for (var folderIndex = 0; folderIndex < numFolders; folderIndex++){
          var curr_folder=allFolders.GetElementAt(folderIndex).QueryInterface(Components.interfaces.nsIMsgFolder);
          var curr_vfolder_uris="";
          if(curr_folder.flags & nsMsgFolderFlags.Virtual){
           //alert('updating: '+curr_folder.name);
           var virtualFolderWrapper = VirtualFolderHelper.wrapVirtualFolder(curr_folder);
           if(this.ConsiderOnlySubfolders){
            //Preload Virtual Folder search uris
            curr_vfolder_uris=virtualFolderWrapper.searchFolderURIs;
            //alert(curr_vfolder_uris);
           }
           var curr_uri_search_string=this.generateFoldersToSearchList(curr_folder.server,curr_vfolder_uris);
            //alert("curr_uri= "+curr_uri_search_string);
            virtualFolderWrapper.searchFolders = curr_uri_search_string;
            virtualFolderWrapper.cleanUpMessageDatabase();
            accountManager.saveVirtualFolders();
          }
        }
    }
  }


//Local Folder Virtual Folders will search on all accounts?
if(this.goAllFromLocalFolders&&!this.ConsiderOnlySubfolders){
  var qsAllFromLocalFolders="";
//Build up the global search_string
  for (var index = 0; index < numServers; index++)
  {
    qsAllFromLocalFolders+="|"+this.generateFoldersToSearchList(allServers.GetElementAt(index));
    //alert("qs= "+qsAllFromLocalFolders.slice(1));
  }
//Assign the global search_string to all the Local Folders' saved search folders.
  for (var index = 0; index < numServers; index++)
  {
    //alert(allServers.GetElementAt(index).realHostName);
    //alert('account: '+index);
    if("Local Folders"==allServers.GetElementAt(index).realHostName){
      var rootFolder  = allServers.GetElementAt(index).QueryInterface(Components.interfaces.nsIMsgIncomingServer).rootFolder;
      if (rootFolder)
      {
        //alert(allServers[index]);
        var allFolders = Components.classes["@mozilla.org/supports-array;1"].createInstance(Components.interfaces.nsISupportsArray);
        rootFolder.ListDescendents(allFolders);
        var numFolders = allFolders.Count();
        for (var folderIndex = 0; folderIndex < numFolders; folderIndex++){
            var curr_folder=allFolders.GetElementAt(folderIndex).QueryInterface(Components.interfaces.nsIMsgFolder);
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
}else if(this.goAllFromLocalFolders&&this.ConsiderOnlySubfolders){
  // TODO
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

processSearchSettingForFolder: function(aFolder, aCurrentSearchURIString)
{
   aCurrentSearchURIString = this.addFolderToSearchListString(aFolder, aCurrentSearchURIString);
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

checkParentSearched: function(curr_folder,curr_vfolder_uris)
{
  if(curr_vfolder_uris=="")return false;
  curr_vfolder_uris_array=curr_vfolder_uris.split("|");
  alert("curr_vfolder_uris: "+curr_vfolder_uris+"  curr_folder.URI: "+curr_folder.URI+"  curr_folder.parentMsgFolder.URI: "+curr_folder.parent.URI);
  if((-1===curr_vfolder_uris_array.indexOf(curr_folder.URI))&&(-1===curr_vfolder_uris_array.indexOf(curr_folder.parent.URI)))return false;
  alert("TRUE!! curr_vfolder_uris: "+curr_vfolder_uris+"  curr_folder.URI: "+curr_folder.URI+"  curr_folder.parentMsgFolder.URI: "+curr_folder.parent.URI);
  return true;
},

generateFoldersToSearchList: function(server,curr_vfolder_uris)
{
  var uriSearchString = "";

    var rootFolder  = server.QueryInterface(Components.interfaces.nsIMsgIncomingServer).rootFolder;
    if (rootFolder)
    {
      uriSearchString = "";
      var allFolders = Components.classes["@mozilla.org/supports-array;1"].createInstance(Components.interfaces.nsISupportsArray);
      rootFolder.ListDescendents(allFolders);
      var numFolders = allFolders.Count();
      for (var folderIndex = 0; folderIndex < numFolders; folderIndex++){ 
          var curr_folder=allFolders.GetElementAt(folderIndex).QueryInterface(Components.interfaces.nsIMsgFolder);
          if(!(curr_folder.flags & nsMsgFolderFlags.Virtual)&&(!this.checkSpecialFolder(curr_folder))&&(curr_folder.server==server)&&(!this.ConsiderOnlySubfolders||(this.checkParentSearched(curr_folder,curr_vfolder_uris)))) uriSearchString = this.processSearchSettingForFolder(curr_folder, uriSearchString);
        }
}
  return uriSearchString;
},
};

window.addEventListener("load", it.micz.SavedSearchThemAll.onLoad, false);
