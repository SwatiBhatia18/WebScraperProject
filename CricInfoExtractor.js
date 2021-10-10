// the purpose of this project is to extract information of worldcup 2019 from cricinfo and present
// that in the form of excel and pdf scorecards
// the real purpose is to learn how to extract information and get experience with js


// npm install minimist 
// npm install axios
// npm install jsdom
// npm install excel4node
// npm install pdf-lib 
// node CricInfoExtractor.js --excel=Worldcup.csv --dataFolder=data --source="https://www.espncricinfo.com/series/icc-cricket-world-cup-2019-1144415/match-results" 

let minimist = require("minimist");
let axios = require("axios");
let jsdom = require("jsdom");
let excel = require("excel4node");
let pdf = require("pdf-lib");
let fs = require("fs");
let args = minimist(process.argv);
let path = require("path");
const { SSL_OP_NO_TLSv1 } = require("constants");
// donwload using axios
// read using jsdom
// make excel using excel4node
// make pdf using pdf-lib

let responseKaPromise = axios.get(args.source);
responseKaPromise.then(function(response){
    let html = response.data;
    let dom = new jsdom.JSDOM(html);
    let document = dom.window.document;
    let matches = [];
    let matchDivs = document.querySelectorAll("div.match-score-block");
    //console.log(matchDivs.length);
    for(let i=0;i<matchDivs.length;i++)
    {
        let match = {
            t1: "",
            t2: "",
            s1: "",
            s2: "",
            result: "",
            detail:""
        } ;
        let teamName = matchDivs[i].querySelectorAll("p.name");
        match.t1 = teamName[0].textContent;
        match.t2 = teamName[1].textContent;
        //match.count = i;
        //console.log(i);
        let matchScore = matchDivs[i].querySelectorAll("div.score-detail > span.score");
        //console.log(matchScore.length);
        if(matchScore.length == 0)
        {
            match.s1 = "";
            match.s2 = "";
        } 
        else if(matchScore.length == 1)
        {
            match.s1 = matchScore[0].textContent;
        }
        else{
            match.s1 = matchScore[0].textContent;
            match.s2 = matchScore[1].textContent;
        }

        let matchResult = matchDivs[i].querySelector("div.status-text > span");
        match.result = matchResult.textContent;

        let matchDetail = matchDivs[i].querySelector("div.match-info > div.description");
        match.detail = matchDetail.textContent;
        matches.push(match);

    }
    let matchesJSON = JSON.stringify(matches);
    fs.writeFileSync("matches.json",matchesJSON,"utf-8");
    
    let teams = [];
    for(let i=0;i<matches.length;i++)
    {
        putTeaminTeamsArrayIfMissing(teams,matches[i]);
    }
    
    for(let i = 0;i<matches.length;i++)
    {
        putMatchesInRespectiveTeams(teams,matches[i]);
    }
    let teamsJSON = JSON.stringify(teams);
    fs.writeFileSync("teams.json",teamsJSON,"utf-8");
    //console.log(teams.length);
    createExcel(teams);
    createFolders(teams);



}).catch(function(err){
    console.log(err);
})

function putTeaminTeamsArrayIfMissing(teams,match)
{
    let t1idx = -1;
    for(let i=0;i<teams.length;i++)
    {
        if(teams[i].name == match.t1)
        {
            t1idx = i;
            break;
        }
    }
    if(t1idx == -1)
    {
        teams.push({
             name : match.t1,
             matches : []
        });
    }
    
    let t2idx = -1;
    for(let i=0;i<teams.length;i++)
    {
        if(teams[i].name == match.t2)
        {
            t2idx = i;
            break;
        }
    }
    if(t2idx == -1)
    {
        teams.push({
             name : match.t2,
             matches : []
        });
    }
    
}

function putMatchesInRespectiveTeams(teams,match){
    let t1idx = -1;
    for(let i=0;i<teams.length;i++)
    {
        if(teams[i].name == match.t1)
        {
            t1idx = i;
            break;
        }
    }
    let team1 = teams[t1idx];
    team1.matches.push({
        vs : match.t2,
        selfScore :  match.s1,
        oppScore : match.s2,
        result : match.result,
        detail : match.detail
    })
    let t2idx = -1;
    for(let i=0;i<teams.length;i++)
    {
        if(teams[i].name == match.t2)
        {
            t2idx = i;
            break;
        }
    }
    let team2 = teams[t2idx];
    team2.matches.push({
        vs : match.t1,
        selfScore :  match.s2,
        oppScore : match.s1,
        result : match.result,
        detail: match.detail
    })
}

function createExcel(teams) {
    let wb = new excel.Workbook();
    var hs = wb.createStyle({
        font:{
            bold: true,
            //underline : true ,
            size: 15,
        },
        fill:{
            type: 'pattern',
            patternType: 'solid',
            fgColor: 'blue'
        }
    })

    for (let i = 0; i < teams.length; i++) {
        let sheet = wb.addWorksheet(teams[i].name);

        sheet.cell(1, 1).string("VS").style(hs);
        sheet.cell(1, 2).string("Self Score").style(hs);
        sheet.cell(1, 3).string("Opp Score").style(hs);
        sheet.cell(1, 4).string("Result").style(hs);
        for (let j = 0; j < teams[i].matches.length; j++) {
            sheet.cell(2 + j, 1).string(teams[i].matches[j].vs);
            sheet.cell(2 + j, 2).string(teams[i].matches[j].selfScore);
            sheet.cell(2 + j, 3).string(teams[i].matches[j].oppScore);
            sheet.cell(2 + j, 4).string(teams[i].matches[j].result);
        }
    }

    wb.write(args.excel);
}

function createFolders(teams){
    if(!fs.existsSync(args.dataFolder)) {
        fs.mkdirSync(args.dataFolder);
    }
    for(let i = 0; i < teams.length; i++){
    let teamFN = path.join(args.dataFolder, teams[i].name);
    if(!fs.existsSync(teamFN)) {
        fs.mkdirSync(teamFN);
    }
    //fs.mkdirSync(teamFN);

    for(let j = 0; j < teams[i].matches.length; j++){
        for (let j = 0; j < teams[i].matches.length; j++) {
            let matchFileName = path.join(teamFN, teams[i].matches[j].vs + ".pdf");
            createScoreCard(teams[i].name, teams[i].matches[j], matchFileName);
        }
    }
}

}

function createScoreCard(teamName, match, matchFileName) {
    let t1 = teamName;
    let t2 = match.vs;
    let s1 = match.selfScore;
    let s2 = match.oppScore;
    let result = match.result;
    let detail = match.detail;

    let bytesOfPDFTemplate = fs.readFileSync("Template2.pdf");
    let pdfdocKaPromise = pdf.PDFDocument.load(bytesOfPDFTemplate);
    pdfdocKaPromise.then(function(pdfdoc){
        let page = pdfdoc.getPage(0);

        page.drawText(t1, {
            x: 38,
            y: 340,
            size: 22
        });
        page.drawText(s1, {
            x: 220,
            y: 340,
            size: 22
        });
        page.drawText(t2, {
            x: 308,
            y: 340,
            size: 22
        });
        page.drawText(s2, {
            x: 480,
            y: 340,
            size: 22
        });
        page.drawText(detail, {
            x: 21,
            y: 200,
            size: 21
        });
        page.drawText(result, {
            x: 38,
            y: 80,
            size: 21
        });

        let finalPDFBytesKaPromise = pdfdoc.save();
        finalPDFBytesKaPromise.then(function(finalPDFBytes){
            fs.writeFileSync(matchFileName, finalPDFBytes);
        })
    })
}

