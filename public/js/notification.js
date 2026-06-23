$(window).on("load", function() { //notifications popup on click, show the corresponding post
    $('.ui.raised.segment').on('click', function(event) {
        const relevantPostNumber = $(this).attr('correspondingPost');
        $.post("/pageLog", {
            path: `/notifications/post/${relevantPostNumber}`,
            _csrf: $('meta[name="csrf-token"]').attr('content')
        });
        //show the relevant post in a popup modal
        $(`.ui.tiny.long.modal[correspondingPost=${relevantPostNumber}]`).modal('show');
        // lazy load the images
        $(".ui.tiny.long.modal .ui.fluid.card img")
            .visibility({
                type: 'image',
                offset: 0,
                onLoad: function(calculations) {
                    $('.ui.tiny.long.modal .ui.fluid.card img').visibility('refresh');
                }
            });
    })
});
