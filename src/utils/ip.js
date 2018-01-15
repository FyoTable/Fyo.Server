CMD = require('./cmd.js');

function GetSections(lines) {
    var sections = [];
    var currentSection = [ lines[0] ];
    for(var i = 1; i < lines.length; i++) {
        var line = lines[i];
        var tabs = line.split('\t');
        //console.log(tabs);
        if(tabs[0] != '') {
            sections.push(currentSection);
            currentSection = [ lines[i] ];
        } else {
            currentSection.push(lines[i]);
        }
    }
    sections.push(currentSection);
    return sections;
}

function SplitOSX(section) {
    // OSX
    var t = section[0].split(':')[0];
    //console.log('Network Type: ', t);

    var ip = '';
    for(var i = 0; i < section.length; i++) {
        var ind = section[i].indexOf('inet ');
        if(ind > -1 ) {
            ip = section[i].substr(6, section[i].indexOf('netmask') - 7);
        }
    }

    return {
        type: t,
        ip: ip
    };
}

function SplitAndroid(section) {
    var t = section[0].split('\t')[0];

    var ip = '';
    for(var i = 0; i < section.length; i++) {
        var ind = section[i].indexOf('inet addr:');
        if(ind > -1 ) {
            ip = section[i].substr(6, section[i].indexOf('Bcast:') - 6);
        }
    }

    return {
        type: t,
        ip: ip
    };
}

function SectionToObj(section) {
    var isAndroid = false;
    if(isAndroid) {
        return SplitAndroid();
    } else {
        return SplitOSX();
    }
}

module.exports = {
    v4: function() {        
        return new Promise( ( resolve, reject ) => {
            var result = '';
            return CMD('ifconfig', [], function(data) {
                result += data;
            }).then(function() {
                var newLines = result.split('\n');
                var sections = GetSections(newLines);
                var objs = sections.map(SectionToObj);
                resolve(objs);
            }).catch(reject);
        });
    }
};