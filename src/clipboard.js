/*
used the same solution trello uses
http://stackoverflow.com/questions/17527870/how-does-trello-access-the-users-clipboard
*/

import domUtils from 'dom-utils';

var me = this;

var textArea;
var textAreaId = 'clipboard-content';

var container;
var containerId = textAreaId + '-container';

function keyDown (event){
  var code = event.keyCode || event.which;
  if(!(event.ctrlKey || event/metaKey)) {
    return;
  }

  var target = event.target;
  if(domUtils.nodeName(target, 'textarea') || domUtils.nodeName(target, 'input')) {
    return;
  }

  if(window.getSelection && window.getSelection() && window.getSelection().toString()) {
    return;
  }

  if(document.selection && document.selection.createRange().text) {
    return;
  }

  setTimeout(function (){
    container = document.querySelector('#' + containerId);
    if(!container) {
      container = document.createElement('div');
      container.id = containerId;
      container.setAttribute('style', [, 'position: fixed;', 'left: 0px;', 'top: 0px;', 'width: 0px;', 'height: 0px;', 'z-index: 100;', 'opacity: 0;'].join(''));
      document.body.appendChild(container);
    }
    container.style.display = 'block';

    textarea = document.createElement('textarea');
    textarea.setAttribute('style', [, 'width: 1px;', 'height: 1px;', 'padding: 0px;'].join(''));
    textarea.id = textAreaId;
    container.innerHTML = '';
    container.appendChild(document.createTextNode(me.value));
    textarea.focus();
    textarea.select();
  }, 0);
}
function keyUp (event){
  var code = event.keyCode || event.which;
  if(event.target.id != textAreaId || code !== 67) {
    return;
  }
  container.style.display = 'none';
}


document.addEventListerner('keydown', keyDown);
document.addEventListerner('keyup', keyUp);

var self = {
  setClipboard: function setClipboard(value) {
    me.value = value;
  }
};

export default self;
