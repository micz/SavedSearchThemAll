Components.utils.import("resource:///modules/virtualFolderWrapper.js");

if(!it) var it={};
if(!it.micz) it.micz={};
if(!it.micz.TBPackage) it.micz.SavedSearchThemAll={};

it.micz.SavedSearchThemAll = {
  onLoad: function() {
    // initialization code
    this.initialized = true;
  },

  onMenuItemCommand: function(e) {
  
  let start_time=Date.now();
  
  //this.strings = document.getElementById("SavedSearchThemAll-strings");
  
  var strbundle = document.getElementById("SavedSearchThemAll-string-bundle");
  var p_msg=strbundle.getString("promptMessage");
  var t_msg=strbundle.getString("promptTitle");
  
  var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);
  if(!promptService.confirm(null,t_msg,p_msg))return;
            
  var accountManager = Components.classes["@mozilla.org/messenger/account-manager;1"].getService(Components.interfaces.nsIMsgAccountManager);
  var allServers = accountManager.allServers;
  var numServers = allServers.Count();
  for (var index = 0; index < numServers; index++)
  {
    //alert('account: '+index);
    var rootFolder  = allServers.GetElementAt(index).QueryInterface(Components.interfaces.nsIMsgIncomingServer).rootFolder;
    if (rootFolder)
    {
      var allFolders = Components.classes["@mozilla.org/supports-array;1"].createInstance(Components.interfaces.nsISupportsArray);
      rootFolder.ListDescendents(allFolders);
      var numFolders = allFolders.Count();
      for (var folderIndex = 0; folderIndex < numFolders; folderIndex++){
          var curr_folder=allFolders.GetElementAt(folderIndex).QueryInterface(Components.interfaces.nsIMsgFolder);
          if(curr_folder.flags & nsMsgFolderFlags.Virtual){
           //alert('updating: '+curr_folder.name);
           var curr_uri_search_string=this.generateFoldersToSearchList(curr_folder.server);
           //alert(curr_uri_search_string);
           let virtualFolderWrapper = VirtualFolderHelper.wrapVirtualFolder(curr_folder);
            virtualFolderWrapper.searchFolders = curr_uri_search_string;
            virtualFolderWrapper.cleanUpMessageDatabase();
            accountManager.saveVirtualFolders();
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

processSearchSettingForFolder: function(aFolder, aCurrentSearchURIString)
{
   aCurrentSearchURIString = this.addFolderToSearchListString(aFolder, aCurrentSearchURIString);
   return aCurrentSearchURIString;
},

generateFoldersToSearchList: function(server)
{
  var uriSearchString = "";
  
  
    var rootFolder  = server.QueryInterface(Components.interfaces.nsIMsgIncomingServer).rootFolder;
    if (rootFolder)
    {
      uriSearchString = this.processSearchSettingForFolder(rootFolder, uriSearchString);
      var allFolders = Components.classes["@mozilla.org/supports-array;1"].createInstance(Components.interfaces.nsISupportsArray);
      rootFolder.ListDescendents(allFolders);
      var numFolders = allFolders.Count();
      for (var folderIndex = 0; folderIndex < numFolders; folderIndex++){ 
          var curr_folder=allFolders.GetElementAt(folderIndex).QueryInterface(Components.interfaces.nsIMsgFolder);
          if(!(curr_folder.flags & nsMsgFolderFlags.Virtual)&&(curr_folder.server==server)) uriSearchString = this.processSearchSettingForFolder(curr_folder, uriSearchString);
        }
}

  return uriSearchString;
},
};

window.addEventListener("load", it.micz.SavedSearchThemAll.onLoad, false);
