'use strict';
var fs = require('fs-extra');
var path = require('path');
var sourceDir = __dirname + "/../docs/";

function fileExists(filePath) {
  try {
    return fs.statSync(filePath).isFile();
  }
  catch (err) {
    return false;
  }
}

function readFile(filePath, requiredExist) {
  var source = sourceDir + filePath;
  if (fileExists(source)) {
    return fs.readFileSync(source, "utf8");
  }
  if(requiredExist == true) {
    throw new Error("File required but not found: " + source);
  }
  return null;
}

function cleanTitle(title) {
  return title.replace(/-/g, " ");
}

module.exports = function(grunt) {
  grunt.registerTask("buildDocs", "Build the theme documentation", function() {
    var version = grunt.config.get("version");

    if (!version) {
      grunt.log.error("No version config set");
      return false;
    }

    var outputDir = __dirname + "/../public/";

    var buildScript = JSON.parse(readFile("build.json"), true);

    var headerTemplate = readFile("core/header.html", true);
    var footerTemplate = readFile("core/footer.html", true);
    var pageTitleTemplate = readFile("core/banner.html");

    var docsPageHeaderTemplate = readFile("core/docs-page-header.html");
    var docsPageFooterTemplate = readFile("core/docs-page-footer.html");
    var docsSectionHeaderTemplate = readFile("core/docs-section-header.html");
    var docsSectionFooterTemplate = readFile("core/docs-section-footer.html");
    var docsSectionBodyTemplate = readFile("core/docs-section-body.html");
    var docsSectionBlockHeaderTemplate = readFile("core/docs-section-block-header.html");
    var docsSectionBlockFooterTemplate = readFile("core/docs-section-block-footer.html");
    var docsSectionBlockTitleTemplate = readFile("core/docs-section-block-title.html");
    var docsSectionBlockExampleTemplate = readFile("core/docs-section-block-example.html");

    var docsSideMenuTemplate = readFile("core/docs-menu.html");
    var docsSideMenuItemTemplate = readFile("core/docs-menu-item.html");

    for(var pageName in buildScript) {
      if(pageName === "vendor") {
        console.log("Copying vendor files...");
        var vendorFiles = buildScript[pageName];
        for(var index in vendorFiles) {
          var vendorPath = vendorFiles[index];
          var vendorFile = vendorPath.split('\\').pop().split('/').pop();
          var extension = /(?:\.([^.]+))?$/.exec(vendorFile)[1];
          var directoryPath = "public/vendor/" + extension;
          var destination = directoryPath + "/" + vendorFile;
          fs.mkdirsSync(directoryPath);
          fs.copySync(vendorPath, destination);
        }
        continue;
      }

      var pageFileName, mainMenuContent, pageContent, pageOutput;

      pageFileName = pageName + ".html";
      mainMenuContent = "";

      //build main menu
      for(var menuPageName in buildScript) {
        if(menuPageName === "vendor") {
          continue;
        }
        var menuPageFileName, menuItemClass;

        menuPageFileName = menuPageName + ".html";
        menuItemClass = "text-capitalize";
        if (pageFileName == menuPageFileName) {
          menuItemClass += " active";
        }
        mainMenuContent += '<li class="' + menuItemClass + '"><a href="' + menuPageFileName + '">' + menuPageName + '</a></li>'
      }

      pageContent = buildScript[pageName];
      //set active menu item
      pageOutput = headerTemplate
                   .replace(/\$MainMenu\$/g, mainMenuContent);

      //generate page banner content
      var pageTitleData = readFile(pageName + "/banner.html")
                          .replace(/<title>/g, "<h1 class='text-capitalize'>")
                          .replace(/<\/title>/g, "</h1>");
      pageOutput += pageTitleTemplate
                    .replace(/\$Body\$/g, pageTitleData);

      pageOutput += docsPageHeaderTemplate;

      var menuItems = "";

      //loop through each content section for page
      for(var sectionName in pageContent) {
        var blockContents = pageContent[sectionName];
        var pageBlocksPath = pageName + "/" + sectionName + "/";

        //Build section h1 and optional introduction body content
        pageOutput += docsSectionHeaderTemplate
                      .replace(/\$Title\$/g, sectionName)
                      .replace(/\$DisplayTitle\$/g, cleanTitle(sectionName));

        if (fileExists(sourceDir + pageBlocksPath + "index.html")) {
          pageOutput += docsSectionBodyTemplate
                        .replace(/\$Body\$/g, readFile(pageBlocksPath + "index.html"));
        }

        var subMenuItems = "";
        //loop through each block for the section (a block is the .html within the section directory)
        for(var i = 0; i < blockContents.length; i++) {
          var pageBlockName = blockContents[i];
          var pageBlockDataBody = readFile(pageBlocksPath + pageBlockName + ".html")
                                  .replace(/<title>/g, "<h3 class='page-header text-capitalize'>")
                                  .replace(/<\/title>/g, "</h3>")
                                  .replace(/<example>/g, "<div class='ls-component'>")
                                  .replace(/<\/example>/g, "</div>");

          pageOutput += docsSectionBlockHeaderTemplate
                        .replace(/\$Title\$/g, sectionName + "-" + pageBlockName)
                        .replace(/\$DisplayTitle\$/g, cleanTitle(pageBlockName))
                        .replace(/\$Body\$/g, pageBlockDataBody);

          pageOutput += docsSectionBlockFooterTemplate
                        .replace(/\$FullTitle\$/g, sectionName + "-" + pageBlockName)

          var subMenuItem = docsSideMenuItemTemplate
                           .replace(/\$MenuLink\$/g, sectionName + "-" + pageBlockName)
                           .replace(/\$MenuTitle\$/g, cleanTitle(pageBlockName))
                           .replace(/\$SubMenu\$/g, "");

          subMenuItems += subMenuItem;
        }

        pageOutput += docsSectionFooterTemplate.replace(/\$Title\$/g, sectionName);

        //Add to top side menu here
        var subMenu = docsSideMenuTemplate
                      .replace(/\$MenuItems\$/g, subMenuItems);
        var menuItem = docsSideMenuItemTemplate
                       .replace(/\$MenuLink\$/g, sectionName)
                       .replace(/\$MenuTitle\$/g, cleanTitle(sectionName))
                       .replace(/\$SubMenu\$/g, subMenu);

        menuItems += menuItem;
      }

      var sideMenu = docsSideMenuTemplate
                     .replace(/\$MenuItems\$/g, menuItems);

      pageOutput += docsPageFooterTemplate
                    .replace(/\$SideMenu\$/g, sideMenu);

      pageOutput += footerTemplate;

      fs.writeFileSync(outputDir + pageFileName, pageOutput);
    }
  });
};
