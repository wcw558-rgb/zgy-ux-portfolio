/* The project index is native HTML; the original artwork remains separate. */
(function () {
  'use strict';
  const base = '作品展示/';
  const arrow = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  const image = (src, className, width, height) => '<img class="' + className + '" src="' + base + src + '" alt="" width="' + width + '" height="' + height + '" decoding="async">';
  const projects = [
    {
      id: 'robotaxi', number: '01', title: '智行伴随', subtitle: '毕业设计',
      art: image('独立界面高清稿/小智-原稿欢迎.png', 'directory-assistant', 435, 580) + '<div class="directory-device directory-device--robotaxi">' + image('智行伴随/界面设计图/猜你想问.png', 'directory-interface', 5120, 2880) + '</div>'
    },
    {
      id: 'crane', number: '02', title: '三一起重机人机界面优化', subtitle: '校企合作项目',
      art: image('独立界面高清稿/三一起重机-设备元素.png', 'directory-crane', 978, 1608) + '<div class="directory-device directory-device--crane">' + image('三一起重机/起重机优化界面.png', 'directory-interface', 5088, 2868) + '</div>'
    },
    {
      id: 'ai', number: '03', title: 'AI如何驱动设计?', subtitle: 'AI驱动设计',
      art: '<div class="directory-ticket directory-ticket--blue">IP形象探索</div><div class="directory-ticket directory-ticket--green">界面检查与修改</div><div class="directory-ticket directory-ticket--purple">个人网页开发</div>'
    }
  ];
  window.PortfolioDirectory = {
    render: function () {
      return '<h1 id="works-heading">SELECTED WORK</h1><div class="directory-grid">' + projects.map(function (project) {
        const href = '#work/' + project.id;
        return '<article class="directory-project directory-project--' + project.id + '" data-project="' + project.id + '"><a class="directory-card" href="' + href + '" aria-labelledby="directory-title-' + project.id + '"><span class="directory-number" aria-hidden="true">' + project.number + '</span><div class="directory-art" aria-hidden="true">' + project.art + '</div><div class="directory-caption"><h2 id="directory-title-' + project.id + '">' + project.title + '</h2><p>' + project.subtitle + '</p><span class="directory-action"><span>去看看</span>' + arrow + '</span></div></a></article>';
      }).join('') + '</div><a class="directory-pdf-link" href="' + window.PortfolioDocument.pdf + '" aria-haspopup="dialog" aria-controls="full-portfolio-dialog"><span>直接浏览完整版作品集 PDF</span>' + arrow + '</a>';
    }
  };
})();
