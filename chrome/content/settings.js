if(!it) var it={};
if(!it.micz) it.micz={};
if(!it.micz.TBPackage) it.micz.SavedSearchThemAllPref={};
 
it.micz.SavedSearchThemAllPref = {
  AllFromLocalFolders_reset: function(){
    var strbundle = document.getElementById("SavedSearchThemAll-string-bundle");
    var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
    prefs = prefs.getBranch("extensions.SavedSearchThemAll.");
    prefs.setBoolPref("AllFromLocalFolders",false);
  },
};
