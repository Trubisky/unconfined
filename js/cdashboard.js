dp = [{x: 0, y: 0}, {x: 1, y: 0},{x: 2, y: 0},{x: 3, y: 0},{x: 4, y: 0},{x: 5, y: 0}];
chart = new CanvasJS.Chart("chartContainer",
    {
      title: {
        text: ""
      },
	  theme: "light2",
	  zoomEnabled:true,
	  axisY:{
        includeZero: false,
		title:"ETH"
      },
	  axisX:{
        includeZero: false,
		title:"Transactions"
      },
        data: [
      {
        type: "area",
        dataPoints: dp
      }
      ]
    });
	chart.render();